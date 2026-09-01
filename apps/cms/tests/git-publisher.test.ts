import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { GitPublisher } from "../src/utils/git-publisher.ts";

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function repositoryFixture(): {
  root: string;
  worktree: string;
  cleanup: () => void;
} {
  const root = mkdtempSync(join(tmpdir(), "andwati-git-publisher-"));
  const remote = join(root, "remote.git");
  const worktree = join(root, "worktree");

  git(root, "init", "--bare", remote);
  git(root, "clone", remote, worktree);
  writeFileSync(join(worktree, "README.md"), "seed\n");
  git(worktree, "add", "README.md");
  git(
    worktree,
    "-c",
    "user.name=Test",
    "-c",
    "user.email=test@example.com",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "-m",
    "seed",
  );
  git(worktree, "branch", "-M", "main");
  git(worktree, "push", "-u", "origin", "main");

  return {
    root,
    worktree,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

test("commits, pushes, and deploys a changed source file", async () => {
  const fixture = repositoryFixture();
  let deploys = 0;
  const publisher = new GitPublisher({
    worktree: fixture.worktree,
    branch: "main",
    deployWebhookUrl: "https://deploy.invalid/hook",
    fetchImpl: async () => {
      deploys += 1;
      return new Response(null, { status: 200 });
    },
  });

  try {
    const contentFile = join(fixture.worktree, "content", "post.md");
    mkdirSync(join(fixture.worktree, "content"));
    writeFileSync(contentFile, "published\n", { flag: "w" });
    const concurrentFile = join(fixture.worktree, "content", "next.md");
    writeFileSync(concurrentFile, "still being edited\n");
    await publisher.publish([contentFile], "content: update post");

    assert.equal(
      git(fixture.worktree, "show", "origin/main:content/post.md"),
      "published",
    );
    assert.equal(deploys, 1);
    assert.equal(readFileSync(concurrentFile, "utf8"), "still being edited\n");
    assert.match(git(fixture.worktree, "status", "--short"), /next\.md/);

    await publisher.publish([contentFile], "content: update post");
    assert.equal(deploys, 1, "unchanged content must not trigger a deploy");
  } finally {
    fixture.cleanup();
  }
});

test("retries a pending deploy without creating another commit", async () => {
  const fixture = repositoryFixture();
  let deploys = 0;
  const publisher = new GitPublisher({
    worktree: fixture.worktree,
    branch: "main",
    deployWebhookUrl: "https://deploy.invalid/hook",
    fetchImpl: async () => {
      deploys += 1;
      return new Response(null, {
        status: deploys === 1 ? 503 : 200,
        statusText: deploys === 1 ? "Unavailable" : "OK",
      });
    },
  });

  try {
    const contentFile = join(fixture.worktree, "entry.md");
    writeFileSync(contentFile, "durable\n");

    await assert.rejects(
      publisher.publish([contentFile], "content: create entry"),
      /Dokploy deploy webhook returned 503/,
    );
    await publisher.publish([contentFile], "content: create entry");

    assert.equal(deploys, 2);
    assert.equal(
      git(fixture.worktree, "rev-list", "--count", "origin/main"),
      "2",
      "the webhook retry must not create a duplicate commit",
    );
  } finally {
    fixture.cleanup();
  }
});
