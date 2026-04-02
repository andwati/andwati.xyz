+++
title = "What is pwn?"
date = 2025-09-03
description = "No not that one"
[taxonomies]
tags = ["blog"]
+++

> Binary Exploitation is a broad topic within Cyber Security which really comes down to finding a vulnerability in the program and exploiting it to gain control of a shell or modifying the program's functions ~ctf101

In most challenges, you’ll be given a Linux binary to exploit, and occasionally a Windows executable. The goal is to find a way to get the program to run in a way that was not intended.

Over the course of this series, we will look at the basics of a binary from simple to advanced concepts. This will be a multipart post covering the concepts over a couple of months. I’ll also use it as a reference to track my own progress.

> This assumes that the reader has some significant experience with programming, i will not be explaining how to write software. The tutorials will be in C, simple enough while being low level for some of the things well do. I recommend reading :
>
> _[The C Programming Language](https://www.amazon.com/Programming-Language-2nd-Brian-Kernighan/dp/0131103628)_[, 2nd Edition, by Brian W. Kernighan and Dennis M. Ritchie (Prentice Hall, 1988).](https://www.amazon.com/Programming-Language-2nd-Brian-Kernighan/dp/0131103628)

---

## Concepts to Cover

This roadmap will take you from _“I don’t know how the stack works”_ to _“I can write exploits for CTFs and understand real-world CVEs.”_

### **Episode 1: Getting Started**

- Why binary exploitation matters (CTFs, real-world, research).
- Computer architecture basics (x86/x64 registers, stack vs heap, memory layout).
- Compiling and running simple C programs.
- Intro to ELF binaries.

---

### **Episode 2: Assembly & Tools Crash Course**

- Function calls in assembly (prologue/epilogue, stack frames).
- Common instructions (`mov`, `call`, `jmp`, `ret`).
- Debugging with `gdb`, `gef`/`pwndbg`.
- Disassembly with `objdump`, `radare2`, and `Ghidra`.

---

### **Episode 3: Memory Corruption 101**

- What is a segmentation fault?
- Stack buffer overflows (first crashes).
- Off-by-one errors.
- Writing your first shellcode and executing it locally.

---

### **Episode 4: Exploiting Control Flow**

- Overwriting return addresses.
- NOP sleds and shellcode execution.
- Return-to-libc attacks (ret2libc).
- Environment variables and argument tricks.

---

### **Episode 5: Format String Vulnerabilities**

- How `printf` becomes an exploit primitive.
- Memory leaks via format strings.
- Overwriting memory using `%n`.

---

### **Episode 6: Modern Protections & Bypasses (Part 1)**

- NX (non-executable stack) and its bypass with ROP.
- Intro to ROP gadgets and building small chains.
- Automating with Pwntools and ROPgadget.

---

### **Episode 7: Modern Protections & Bypasses (Part 2)**

- ASLR: how randomization works.
- Leaking addresses to defeat ASLR.
- Stack canaries and partial overwrites.

---

### **Episode 8: Heap Exploitation (Basics)**

- Understanding malloc/free and heap metadata.
- Classic heap overflows.
- Use-after-free and double free.
- Simple heap exploitation demos.

---

### **Episode 9: Heap Exploitation (Advanced)**

- Unlink attacks and unsafe unlink.
- Fastbin dup tricks.
- The “House of” techniques:
  - House of Force
  - House of Spirit
  - House of Lore
  - House of Einherjar

- Tcache poisoning in modern glibc.

---

### **Episode 10: Advanced Exploitation Techniques**

- GOT/PLT overwrites.
- Ret2dlresolve.
- Sigreturn-oriented programming (SROP).
- JOP (Jump-Oriented Programming).

---

### **Episode 11: Kernel & Windows Exploitation (Intro)**

- Userland vs kernel space.
- Exploiting syscalls for privilege escalation.
- Windows basics: SEH overwrites, DEP/ASLR bypass.
- Kernel driver exploitation.

---

### **Episode 12: Modern Defenses & Mitigations**

- Control-Flow Integrity (CFI).
- Shadow stacks & CET.
- Hardened malloc and allocator security.
- Sandboxing & seccomp-bpf.

---

### **Episode 13: Exploit Workflow in Practice**

- Solving a CTF challenge step-by-step.
- Remote exploitation (exploiting over sockets).
- Exploit reliability (stability, bruteforcing).
- Post-exploitation steps (getting a shell, escalating privileges).

---

### **Episode 14: Beyond the Basics**

- Automating exploit discovery with fuzzing (AFL, honggfuzz).
- Symbolic execution with angr.
- Real-world case studies (Heartbleed, Dirty COW, Shellshock).
- Writing weaponized exploits responsibly.
