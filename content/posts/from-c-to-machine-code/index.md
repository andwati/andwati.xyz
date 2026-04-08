+++
title = "From C to Machine Code: What Actually Runs"
description = "Before diving into how to break a program, we need to understand what the computer is actually executing"
author = "mockingspectre"
date = 2026-04-08
[taxonomies]
tags = ["assembly", "rev", "pwn"]
+++

{{ youtube(id="KbH239zvDtM") }}

Before diving into how to break a program, we need to understand what the computer is actually executing. When you write a C program, the processor doesn't understand a single line of it. The C language exists for *our* benefit, allowing us to write logic without having to manually shuffle bits around in the processor.

To bridge this gap, we use a compiler (like `GCC`), which translates our human-readable C code into machine code—raw binary instructions. Assembly language is simply the human-readable representation of that machine code.

Because we usually don't have the original C source code when analyzing malware or playing a CTF, we are forced to read the assembly. (Though tools like Ghidra can try to decompile assembly back into C-like pseudocode to save us from staring at assembly instructions all day).

Let's look at what a basic `printf("Hello World!");` program actually turns into.

```c 
#include <stdio.h>

int main(){  
 printf("hello world\n");  
 return 0;  
}  
```  
We will compile the  hello world C program, then  dump the assembly in Intel syntax(it defaults to AT&T syntax, a cancer).

```sh 
gcc -o hello hello.c **&&** objdump -d -M intel hello **|** grep -A 15 **"**<main>:**"**  
```

<br>

```asm  
0000000000001139 <main>:  
    1139:       55                      push   rbp  
    113a:       48 89 e5                mov    rbp,rsp  
    113d:       48 8d 05 c0 0e 00 00    lea    rax,[rip+0xec0]        # 2004 <_IO_stdin_used+0x4>  
    1144:       48 89 c7                mov    rdi,rax  
    1147:       e8 e4 fe ff ff          call   1030 <puts@plt>  
    114c:       b8 00 00 00 00          mov    eax,0x0  
    1151:       5d                      pop    rbp  
    1152:       c3                      ret

Disassembly of section .fini:

0000000000001154 <_fini>:  
    1154:       48 83 ec 08             sub    rsp,0x8  
    1158:       48 83 c4 08             add    rsp,0x8  
    115c:       c3                      ret

```

Notice how different this looks from C. The processor executes different instruction sets depending on its architecture. The two most common architectures you will encounter  are 32-bit (x86) and 64-bit (x86_64 or just  x64/AMD64/Intel 64).

## **The Processor's Workbench: Registers**

To process data rapidly, the CPU doesn't want to constantly reach all the way out to your system's RAM. Instead, it uses registers—extremely fast, temporary storage buckets located directly on the processor.

Here are the critical x64 registers you need to know:

* **`rip` (Instruction Pointer):** The most important register for exploitation. It points to the exact memory address of the *next* instruction the CPU is supposed to execute.  
* **`rsp` (Stack Pointer):** Points to the very top of your current stack frame.  
* **`rbp` (Base Pointer):** Points to the bottom of your current stack frame.

### **General Purpose Registers & Calling Conventions**

There are also general-purpose registers (`rax`, `rbx`, `rcx`, `rdx`, `rsi`, `rdi`, and `r8` through `r15`). While they can be used for general math and data storage, they have strict roles when functions are called.

In x64 Linux, when a function is called, the arguments are passed directly into registers in this specific order:

1. `rdi` (First argument)  
2. `rsi` (Second argument)  
3. `rdx` (Third argument)  
4. `rcx` (Fourth argument)  
5. `r8` (Fifth argument)  
6. `r9` (Sixth argument)

{% note() %}
In older x86 32-bit binaries, arguments aren't passed in registers at all; they are pushed onto the stack. When a function finishes and returns a value, that return value is almost always placed in the **`rax`** register (or `eax` in 32-bit).
{% end %}

### **Register Sizes and "Words"**

Registers have different sizes depending on the architecture, and you can reference smaller chunks of a larger register. In binary exploitation, you'll frequently see data referred to by size:

**Word:** 2 bytes

**Dword (Double Word):** 4 bytes

**Qword (Quad Word):** 8 bytes

Here is how x64 registers break down into smaller accessible chunks:

| 8-Byte (Qword)[64 bit] | Lower 4-Bytes (Dword)[lower 32 bits] | Lower 2-Bytes (Word)[lower 16 bits] | Lower 1-Byte[lower 8 bits] |
| :---- | :---- | :---- | :---- |
| rax | eax | ax | al |
| rbx | ebx | bx | bl |
| rcx | ecx | cx | cl |
| rdx | edx | dx | dl |
| rdi | edi | di | dil |
| rsi | edi | si | sil |
| rsp | esp | sp | spl |
| rbp | ebp | bp | bpl |
| rip | eip | - | - |
| r8 | r8d | r8w | r8b |
| r9 | r9d | r9w | r9b |
| r10 | r10d | r10w | r10b |
| r11 | r11d | r11w | r11b |
| r12 | r12d | r12w | r12b |
| r13 | r13d | r13w | r13b |
| r14 | r14d | r14w | r14b |
| r15 | r15d | r15w | r15b |

<br>
<p>If you are dealing with a 32-bit (x86) binary, the 8-byte 'R' registers don't exist. The largest buckets you have are the 4-byte 'E' registers (`eax`, `ebp`, etc.).</p>


## **The Stack**

The stack is a segment of memory heavily used during execution. It's primarily used to store local variables, keep track of function calls, and manage control flow. It operates as a LIFO (Last-In, First-Out) structure—meaning you can only add (push) to the top of it, and remove (pop) from the top of it.

The boundaries of the current stack space are tracked by `rbp` (the base) and `rsp` (the top). When you declare a local variable in C, like `int x = 5;`, the program allocates space for it on the stack.

Consider stack.c

```c

#include<stdio.h>

int main() {

  int x = 5;

  puts("hi");

}

```

Compile this with the command:

```sh
gcc -o stack stack.c && objdump -d -M intel stack | grep -A 15 "<main>:"
```

```asm
0000000000001139 <main>:

    1139:       55                      push   rbp

    113a:       48 89 e5                mov    rbp,rsp

    113d:       48 83 ec 10             sub    rsp,0x10

    1141:       c7 45 fc 05 00 00 00    mov    DWORD PTR [rbp-0x4],0x5

    1148:       48 8d 05 b5 0e 00 00    lea    rax,[rip+0xeb5]        # 2004 <_IO_stdin_used+0x4>

    114f:       48 89 c7                mov    rdi,rax

    1152:       e8 d9 fe ff ff          call   1030 <puts@plt>

    1157:       b8 00 00 00 00          mov    eax,0x0

    115c:       c9                      leave

    115d:       c3                      ret

Disassembly of section .fini:

0000000000001160 <_fini>:

    1160:       48 83 ec 08             sub    rsp,0x8

```
<br>

In your output, you'll see an instruction moving the value `0x5` into a memory location relative to the base pointer, usually something like `[rbp-0x4]`. That is your local variable resting on the stack.

## **The Heap**

We will just do an overview of this section. It can get quite complex very fast. We will eventually cover them in future articles. 

If the stack is the CPU’s fast, tightly organized workbench, the heap is the massive, slightly chaotic warehouse out back.

The stack is great for small, temporary variables, but it has severe limitations: it is relatively small, and you must know exactly how much space you need at compile time. What if you want to load a 10MB image file? Or what if you are accepting user input and you don't know if the user will type 10 characters or 10,000?

For dynamic, large, or unpredictable data, we use the **Heap**.

Unlike the stack, which the CPU manages automatically by just moving the `rsp` register up and down, the heap is entirely manual. The programmer must explicitly ask the operating system for a chunk of memory, and more importantly, they must explicitly give it back when they are done.

In C, this is done using the `malloc()` (memory allocate) and `free()` functions.

Consider heap.c

```c  
#include <stdlib.h>  
#include <string.h>

int main() {  
    // Ask the warehouse for 64 bytes of space  
    char *buffer = (char *)malloc(64);  
      
    // Put some data into that space  
    strcpy(buffer, "hello heap");  
      
    // Give the space back to the warehouse  
    free(buffer);  
      
    return 0;  
}

```  

Now we do the necessary:

```sh 
gcc -o heap heap.c && objdump -d -M intel heap | grep -A 20 "<main>:"

```

<br>

```asm
0000000000001149 **<main>:**  
   1149:       55                      push   rbp  
   114a:       48 89 e5                mov    rbp,rsp  
   114d:       48 83 ec 10             sub    rsp,0x10  
   1151:       bf 40 00 00 00          mov    edi,0x40  
   1156:       e8 e5 fe ff ff          call   1040 <malloc@plt>  
   115b:       48 89 45 f8             mov    QWORD PTR [rbp-0x8],rax  
   115f:       48 8b 45 f8             mov    rax,QWORD PTR [rbp-0x8]  
   1163:       48 ba 68 65 6c 6c 6f    movabs rdx,0x6568206f6c6c6568  
   116a:       20 68 65    
   116d:       48 89 10                mov    QWORD PTR [rax],rdx  
   1170:       c7 40 07 65 61 70 00    mov    DWORD PTR [rax+0x7],0x706165  
   1177:       48 8b 45 f8             mov    rax,QWORD PTR [rbp-0x8]  
   117b:       48 89 c7                mov    rdi,rax  
   117e:       e8 ad fe ff ff          call   1030 <free@plt>  
   1183:       b8 00 00 00 00          mov    eax,0x0  
   1188:       c9                      leave  
   1189:       c3                      ret

Disassembly of section .fini:
```

When you look at this assembly, you won't see data simply being pushed onto the stack. Instead, you will see instructions setting up arguments (like putting `0x40`—which is 64 in hex—into the `edi` register) followed by a `call` to `malloc@plt`.

`malloc` acts as the warehouse manager. It goes out, finds 64 bytes of free space in the heap memory region, and returns a pointer (a memory address) to that space in the `tax` register.

This manual management is exactly why the heap is such a prime target for exploitation. If a programmer calls `malloc` but forgets to call `free`, the program leaks memory. If they call `free` but keep using the pointer anyway, you get a "Use-After-Free" vulnerability. If they ask for 64 bytes but copy 100 bytes into it, you get a Heap Overflow. Breaking the heap means tricking the warehouse manager (`glibc`'s allocator) into giving you access to things you shouldn't have.

## **The CPU's Instruction Set**

Assembly might look like gibberish at first, but it essentially boils down to moving data, doing basic math, and jumping around memory. Here are the most common instructions you will encounter:

### **Moving Data**

* **`mov dest, src`**: Copies data from the source to the destination. (`mov rax, rdx` copies the value in `rdx` into `rax`).  
* **Dereferencing `[]`**: Brackets act like pointers in C. `mov rax, [rdx]` doesn't move `rdx` itself; it goes to the memory address stored in `rdx` and grabs the value sitting there. Conversely, `mov [rax], rdx` takes the value in `rdx` and writes it into the memory address pointed to by `rax`.  
* **`lea dest, src`**: Load Effective Address. It calculates a memory address and stores the *address itself* in the destination, rather than the data at that address. (`lea rdi, [rbx+0x10]`).

### **Math and Logic**

* **`add dest, src` / `sub dest, src`**: Adds or subtracts the source from the destination, storing the result in the destination.  
* **`xor dest, src`**: Performs a bitwise exclusive OR. (You will frequently see `xor rax, rax`—this is simply an optimized way to set `rax` to 0).

### **Stack Operations**

* **`push reg`**: Subtracts from `rsp` to grow the stack, then places the register's value onto the new top of the stack.  
* **`pop reg`**: Takes the value from the top of the stack, puts it into the register, and adds to `rsp` to shrink the stack.


### **Control Flow**

* **`jmp address`**: Unconditionally redirects code execution to a new memory address.  
* **`call address`**: Used to invoke functions. It pushes the current `rip` onto the stack (so the program remembers where it was) and then jumps to the new address.  
* **`ret`**: Pops the saved address off the stack and places it back into `rip`, seamlessly resuming execution where it left off before the `call`.

### **Conditionals and Flags**

The CPU has a special register dedicated to **Flags**—individual bits that indicate the state of the processor (e.g., the Zero Flag, Carry Flag, Sign Flag).

* **`cmp arg1, arg2`**: Compares two values by silently subtracting them. It doesn't save the mathematical result; instead, it updates the CPU Flags (like setting the Zero Flag if the two values were equal).  
* **`jz` / `jnz`**: Jump if Zero / Jump if Not Zero. These look at the CPU flags set by a previous `cmp` instruction. If the Zero Flag is set, `jz` will take the jump. If not, the program just continues to the next instruction.

There is one register that contains flags. A flag is a particular bit of this register. If it is set or not, will typically mean something. Here is the list of flags.

```txt
00:     Carry Flag  
01:     always 1  
02:     Parity Flag  
03:     always 0  
04:     Adjust Flag  
05:     always 0  
06:     Zero Flag  
07:     Sign Flag  
08:     Trap Flag  
09:     Interruption Flag       
10:     Direction Flag  
11:     Overflow Flag  
12:     I/O Privilege Field lower bit  
13:     I/O Privilege Field higher bit  
14:     Nested Task Flag  
15:     Resume Flag  
```
<br>

There are other flags then the one listed, however we really don't deal with them too much (and out of these, there are only a few we actively deal with).

This has been a lot to unpack but it will get simpler with time. Now that we understand how C code becomes assembly, how the CPU juggles data in registers, and how the stack manages memory, we need to look at how all of this is packaged together by the operating system. Next, we will dive deeper into the structure of the ELF binary itself.

You can support my work at [https://buymeacoffee.com/mockingspectre](https://buymeacoffee.com/mockingspectre)

## Further Reading

[https://en.wikibooks.org/wiki/X86_Assembly/X86_Architecture](https://en.wikibooks.org/wiki/X86_Assembly/X86_Architecture)  
[https://en.wikipedia.org/wiki/Assembly_language](https://en.wikipedia.org/wiki/Assembly_language) 

