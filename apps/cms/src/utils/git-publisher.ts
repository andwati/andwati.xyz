import { execFile } from "node:child_process";
import { relative, resolve } from "node:path";
import { promisify } from "node:util";
import { repositoryRoot } from "./content-paths";

const execFileAsync = promisify(execFile);

interface GitPublisherConfig {
  worktree: string;
  remote?: string;
  branch?: string;
  token?: string;
  commitName?: string;
  commitEmail?: string;
  deployWebhookUrl?: string;
  fetchImpl?: typeof fetch;
}

function gitAuthenticationEnv(token?: string): NodeJS.ProcessEnv {
  if (!token) return process.env;

  const credentials = Buffer.from(`x-access-token:${token}`).toString("base64");
  return {
    ...process.env,
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "http.https://github.com/.extraheader",
    GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${credentials}`,
  };
}

export class GitPublisher {
  private readonly worktree: string;
  private readonly remote: string;
  private readonly branch: string;
  private readonly token?: string;
  private readonly commitName: string;
  private readonly commitEmail: string;
  private readonly deployWebhookUrl?: string;
  private readonly fetchImpl: typeof fetch;
  private queue: Promise<void> = Promise.resolve();
  private deployPending = false;

  constructor(config: GitPublisherConfig) {
    this.worktree = resolve(config.worktree);
    this.remote = config.remote ?? "origin";
    this.branch = config.branch ?? "main";
    this.token = config.token;
    this.commitName = config.commitName ?? "andwati.com CMS";
    this.commitEmail =
      config.commitEmail ?? "andwati-cms@users.noreply.github.com";
    this.deployWebhookUrl = config.deployWebhookUrl;
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  publish(paths: string[], message: string): Promise<void> {
    const operation = this.queue.then(() => this.publishNow(paths, message));
    this.queue = operation.catch(() => undefined);
    return operation;
  }

  private async git(args: string[]): Promise<string> {
    const { stdout } = await execFileAsync("git", args, {
      cwd: this.worktree,
      env: gitAuthenticationEnv(this.token),
      timeout: 30_000,
    });
    return stdout.trim();
  }

  private repositoryPaths(paths: string[]): string[] {
    return [...new Set(paths)].map((path) => {
      const absolute = resolve(path);
      const repositoryPath = relative(this.worktree, absolute);
      if (
        repositoryPath === "" ||
        repositoryPath === ".." ||
        repositoryPath.startsWith("../")
      ) {
        throw new Error(
          `Refusing to publish path outside Git checkout: ${path}`,
        );
      }
      return repositoryPath;
    });
  }

  private async hasStagedChanges(): Promise<boolean> {
    try {
      await this.git(["diff", "--cached", "--quiet"]);
      return false;
    } catch (error) {
      if ((error as { code?: number }).code === 1) return true;
      throw error;
    }
  }

  private async publishNow(paths: string[], message: string): Promise<void> {
    const repositoryPaths = this.repositoryPaths(paths);
    await this.git(["add", "--all", "--", ...repositoryPaths]);

    if (await this.hasStagedChanges()) {
      await this.git([
        "-c",
        `user.name=${this.commitName}`,
        "-c",
        `user.email=${this.commitEmail}`,
        "-c",
        "commit.gpgsign=false",
        "commit",
        "-m",
        message,
      ]);
    }

    await this.git(["fetch", this.remote, this.branch]);
    try {
      await this.git([
        "rebase",
        "--autostash",
        `${this.remote}/${this.branch}`,
      ]);
    } catch (error) {
      await this.git(["rebase", "--abort"]).catch(() => undefined);
      throw error;
    }

    const ahead = Number(
      await this.git([
        "rev-list",
        "--count",
        `${this.remote}/${this.branch}..HEAD`,
      ]),
    );
    if (ahead > 0) {
      await this.git(["push", this.remote, `HEAD:${this.branch}`]);
      this.deployPending = true;
    }

    if (this.deployPending && this.deployWebhookUrl) {
      const response = await this.fetchImpl(this.deployWebhookUrl, {
        method: "POST",
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        throw new Error(
          `Dokploy deploy webhook returned ${response.status} ${response.statusText}`,
        );
      }
      this.deployPending = false;
    }
  }
}

let publisher: GitPublisher | undefined;

function publisherFromEnvironment(): GitPublisher | undefined {
  if (process.env.GIT_PUBLISH_ENABLED !== "true") return undefined;

  const token = process.env.GITHUB_TOKEN;
  const deployWebhookUrl = process.env.DOKPLOY_DEPLOY_WEBHOOK_URL;
  if (!token) throw new Error("GITHUB_TOKEN is required for Git publishing");
  if (!deployWebhookUrl) {
    throw new Error(
      "DOKPLOY_DEPLOY_WEBHOOK_URL is required for Git publishing",
    );
  }

  return new GitPublisher({
    worktree: repositoryRoot(),
    remote: process.env.CONTENT_GIT_REMOTE ?? "origin",
    branch: process.env.CONTENT_GIT_BRANCH ?? "main",
    token,
    commitName: process.env.CONTENT_GIT_COMMIT_NAME,
    commitEmail: process.env.CONTENT_GIT_COMMIT_EMAIL,
    deployWebhookUrl,
  });
}

/** Publishes changed source files when production Git publishing is enabled. */
export async function publishContentChanges(
  paths: string[],
  message: string,
): Promise<void> {
  publisher ??= publisherFromEnvironment();
  await publisher?.publish(paths, message);
}
