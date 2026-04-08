from manim import *

# ─────────────────────────────────────────────
#  Shared palette
# ─────────────────────────────────────────────
BG       = "#0d1117"
ACCENT   = "#58a6ff"
GREEN    = "#3fb950"
ORANGE   = "#f0883e"
RED      = "#f85149"
PURPLE   = "#bc8cff"
GRAY     = "#8b949e"
WHITE    = "#e6edf3"

config.background_color = BG


# ─────────────────────────────────────────────
#  Helper: section title card
# ─────────────────────────────────────────────
def title_card(scene: Scene, title: str, subtitle: str = ""):
    bg = Rectangle(width=14, height=8, fill_color=BG, fill_opacity=1, stroke_width=0)
    bar = Line(LEFT * 6, RIGHT * 6, color=ACCENT, stroke_width=3)
    t = Text(title, font="JetBrains Mono", color=WHITE, font_size=52, weight=BOLD)
    s = Text(subtitle, font="JetBrains Mono", color=GRAY, font_size=28) if subtitle else VMobject()
    t.move_to(UP * 0.4)
    s.next_to(t, DOWN, buff=0.4)
    bar.next_to(t, UP, buff=0.55)
    grp = VGroup(bg, bar, t, s)
    scene.play(FadeIn(bar), Write(t), FadeIn(s), run_time=1.4)
    scene.wait(1.5)
    scene.play(FadeOut(grp), run_time=0.6)


# ─────────────────────────────────────────────
#  1. Intro
# ─────────────────────────────────────────────
class S01_Intro(Scene):
    def construct(self):
        # Animated headline
        headline = Text("From C to Machine Code", font="JetBrains Mono",
                        color=ACCENT, font_size=56, weight=BOLD)
        sub = Text("What Actually Runs", font="JetBrains Mono",
                   color=WHITE, font_size=34)
        byline = Text("mockingspectre", font="JetBrains Mono",
                      color=GRAY, font_size=22)

        headline.move_to(UP * 1.2)
        sub.next_to(headline, DOWN, buff=0.5)
        byline.next_to(sub, DOWN, buff=0.7)

        accent_line = Line(LEFT * 3.5, RIGHT * 3.5, color=ACCENT, stroke_width=2)
        accent_line.next_to(sub, DOWN, buff=0.3)

        self.play(Write(headline), run_time=1.6)
        self.play(FadeIn(sub, shift=UP * 0.3), run_time=0.9)
        self.play(GrowFromCenter(accent_line), run_time=0.6)
        self.play(FadeIn(byline), run_time=0.7)
        self.wait(2.5)

        # C → ASM → Binary flow diagram
        c_box   = self._box("C Source", GREEN,   LEFT * 4.5)
        asm_box = self._box("Assembly", ORANGE,  ORIGIN)
        bin_box = self._box("Machine\nCode", RED, RIGHT * 4.5)

        arr1 = Arrow(c_box.get_right(), asm_box.get_left(),   color=ACCENT, buff=0.15)
        arr2 = Arrow(asm_box.get_right(), bin_box.get_left(), color=ACCENT, buff=0.15)
        lbl1 = Text("GCC compiler", font="JetBrains Mono", color=GRAY, font_size=18).next_to(arr1, UP, buff=0.1)
        lbl2 = Text("assemble",     font="JetBrains Mono", color=GRAY, font_size=18).next_to(arr2, UP, buff=0.1)

        self.play(FadeOut(headline, sub, accent_line, byline), run_time=0.5)
        self.play(FadeIn(c_box), run_time=0.5)
        self.play(GrowArrow(arr1), FadeIn(lbl1), run_time=0.7)
        self.play(FadeIn(asm_box), run_time=0.5)
        self.play(GrowArrow(arr2), FadeIn(lbl2), run_time=0.7)
        self.play(FadeIn(bin_box), run_time=0.5)
        self.wait(2.5)
        self.play(*[FadeOut(m) for m in self.mobjects])

    @staticmethod
    def _box(label, color, pos):
        rect = RoundedRectangle(corner_radius=0.2, width=2.6, height=1.1,
                                fill_color=color, fill_opacity=0.15,
                                stroke_color=color, stroke_width=2)
        txt  = Text(label, font="JetBrains Mono", color=color, font_size=24)
        grp  = VGroup(rect, txt).move_to(pos)
        return grp


# ─────────────────────────────────────────────
#  2. Hello World: C → Assembly walkthrough
# ─────────────────────────────────────────────
class S02_HelloWorld(Scene):
    def construct(self):
        title_card(self, "Hello World", "C → Assembly")

        # Left: C code
        c_src = [
            ("#include <stdio.h>", GRAY),
            ("", WHITE),
            ("int main(){", WHITE),
            ('    printf("hello world\\n");', GREEN),
            ("    return 0;", WHITE),
            ("}", WHITE),
        ]
        c_lines = VGroup(*[
            Text(line, font="JetBrains Mono", color=col, font_size=20)
            for line, col in c_src
        ])
        c_lines.arrange(DOWN, aligned_edge=LEFT, buff=0.18)
        c_bg = BackgroundRectangle(c_lines, color="#161b22", fill_opacity=1,
                                   buff=0.25, corner_radius=0.15)
        c_code = VGroup(c_bg, c_lines).shift(LEFT * 3.4 + UP * 0.5)

        c_label = Text("hello.c", font="JetBrains Mono", color=GREEN, font_size=22
                       ).next_to(c_code, UP, buff=0.2)

        self.play(FadeIn(c_label), FadeIn(c_code), run_time=1.0)
        self.wait(0.8)

        # Command
        cmd_txt = Text("gcc -o hello hello.c && objdump -d -M intel hello",
                       font="JetBrains Mono", color=ORANGE, font_size=17
                       ).shift(DOWN * 2.8)
        self.play(Write(cmd_txt), run_time=1.2)
        self.wait(0.5)

        # Right: ASM output
        asm_lines = [
            ("1139:", "55",             "push    rbp"),
            ("113a:", "48 89 e5",       "mov     rbp, rsp"),
            ("113d:", "48 8d 05 c0 0e", "lea     rax, [rip+0xec0]"),
            ("1144:", "48 89 c7",       "mov     rdi, rax"),
            ("1147:", "e8 e4 fe ff ff", "call    puts@plt"),
            ("114c:", "b8 00 00 00 00", "mov     eax, 0x0"),
            ("1151:", "5d",             "pop     rbp"),
            ("1152:", "c3",             "ret"),
        ]
        asm_group = self._asm_block(asm_lines).shift(RIGHT * 3.1 + UP * 0.5)
        asm_label = Text("objdump output", font="JetBrains Mono",
                         color=ORANGE, font_size=22).next_to(asm_group, UP, buff=0.2)

        self.play(FadeIn(asm_label), FadeIn(asm_group), run_time=1.0)
        self.wait(0.5)

        # Annotate key lines — asm_group[0]=bg, asm_group[1]=VGroup of rows
        rows = asm_group[1]
        note = Text("rdi ← pointer to \"hello world\"",
                    font="JetBrains Mono", color=ACCENT, font_size=19
                    ).next_to(asm_group, DOWN, buff=0.25)
        self.play(rows[3].animate.set_color(ACCENT),
                  rows[4].animate.set_color(PURPLE),
                  Write(note), run_time=1.0)
        self.wait(2.5)
        self.play(*[FadeOut(m) for m in self.mobjects])

    @staticmethod
    def _asm_block(lines):
        rows = VGroup()
        for addr, hex_b, mnemonic in lines:
            row = Text(f"{addr:<8} {hex_b:<20} {mnemonic}",
                       font="JetBrains Mono", color=WHITE, font_size=17)
            rows.add(row)
        rows.arrange(DOWN, aligned_edge=LEFT, buff=0.18)
        bg = BackgroundRectangle(rows, color="#161b22", fill_opacity=1,
                                  buff=0.2, corner_radius=0.15)
        return VGroup(bg, rows)


# ─────────────────────────────────────────────
#  3. Registers
# ─────────────────────────────────────────────
class S03_Registers(Scene):
    def construct(self):
        title_card(self, "Registers", "The CPU's Workbench")

        # Register diagram: rax broken into sub-registers
        regs = [
            ("rax  (64-bit / 8 bytes)",  ACCENT,  4.8),
            ("eax  (32-bit / 4 bytes)",  GREEN,   3.2),
            ("ax   (16-bit / 2 bytes)",  ORANGE,  1.9),
            ("al   ( 8-bit / 1 byte )",  RED,     0.95),
        ]
        bars = VGroup()
        labels = VGroup()
        for name, color, width in regs:
            bar = Rectangle(width=width, height=0.52,
                            fill_color=color, fill_opacity=0.25,
                            stroke_color=color, stroke_width=2)
            lbl = Text(name, font="JetBrains Mono", color=color, font_size=19)
            lbl.next_to(bar, RIGHT, buff=0.25)
            bars.add(bar)
            labels.add(lbl)

        for i, bar in enumerate(bars):
            bar.align_to(bars[0], LEFT)
        group = VGroup(*[VGroup(bars[i], labels[i]) for i in range(len(bars))])
        group.arrange(DOWN, aligned_edge=LEFT, buff=0.22).shift(LEFT * 1 + UP * 0.5)

        self.play(LaggedStart(*[FadeIn(g) for g in group], lag_ratio=0.3), run_time=1.6)
        self.wait(1.0)

        caption = Text("Smaller aliases point into the same physical register",
                       font="JetBrains Mono", color=GRAY, font_size=21
                       ).shift(DOWN * 2.6)
        self.play(Write(caption))
        self.wait(1.5)
        self.play(FadeOut(group, caption))

        # Calling convention diagram
        title_card(self, "Calling Convention", "Argument passing in x64 Linux")

        args = [
            ("1st arg", "rdi", ACCENT),
            ("2nd arg", "rsi", GREEN),
            ("3rd arg", "rdx", ORANGE),
            ("4th arg", "rcx", PURPLE),
            ("5th arg", "r8",  RED),
            ("6th arg", "r9",  GRAY),
        ]
        cols = VGroup()
        for label, reg, color in args:
            arg_t = Text(label, font="JetBrains Mono", color=WHITE, font_size=22)
            arr   = Arrow(LEFT * 0.1, RIGHT * 0.9, color=color, buff=0)
            reg_t = Text(reg, font="JetBrains Mono", color=color,
                         font_size=26, weight=BOLD)
            row = VGroup(arg_t, arr, reg_t).arrange(RIGHT, buff=0.3)
            cols.add(row)
        cols.arrange(DOWN, buff=0.28).shift(UP * 0.3)

        ret_row = Text("return value → rax", font="JetBrains Mono",
                       color=ACCENT, font_size=24).next_to(cols, DOWN, buff=0.5)

        self.play(LaggedStart(*[FadeIn(r) for r in cols], lag_ratio=0.22), run_time=1.8)
        self.play(Write(ret_row))
        self.wait(2.5)
        self.play(*[FadeOut(m) for m in self.mobjects])


# ─────────────────────────────────────────────
#  4. The Stack
# ─────────────────────────────────────────────
class S04_Stack(Scene):
    def construct(self):
        title_card(self, "The Stack", "LIFO — Last In, First Out")

        # Animated stack push/pop
        stack_slots = VGroup()
        slot_labels = []
        N = 6
        for i in range(N):
            rect = Rectangle(width=3.2, height=0.72,
                             fill_color="#161b22", fill_opacity=1,
                             stroke_color=GRAY, stroke_width=1.5)
            stack_slots.add(rect)
        stack_slots.arrange(DOWN, buff=0).shift(LEFT * 3 + UP * 0.5)

        self.play(FadeIn(stack_slots))

        # Labels: lower address at top
        addr_labels = VGroup()
        for i, slot in enumerate(stack_slots):
            a = Text(f"0x...{(0x28 - i*8):02x}", font="JetBrains Mono",
                     color=GRAY, font_size=16)
            a.next_to(slot, RIGHT, buff=0.15)
            addr_labels.add(a)
        self.play(FadeIn(addr_labels))

        # rsp / rbp pointers
        rbp_ptr = Arrow(RIGHT * 0.8, stack_slots[-1].get_right() + LEFT * 0.01,
                        color=ORANGE, buff=0.05)
        rbp_lbl = Text("rbp", font="JetBrains Mono", color=ORANGE,
                       font_size=22, weight=BOLD).next_to(rbp_ptr, RIGHT, buff=0.1)
        rsp_ptr = Arrow(RIGHT * 0.8, stack_slots[-1].get_right() + LEFT * 0.01,
                        color=ACCENT, buff=0.05)
        rsp_lbl = Text("rsp", font="JetBrains Mono", color=ACCENT,
                       font_size=22, weight=BOLD).next_to(rsp_ptr, RIGHT, buff=0.1)

        self.play(FadeIn(rbp_ptr, rbp_lbl))

        # Push simulation: fill slots from bottom up
        push_values = ["saved rbp", "local: x=5", "saved rip", "arg 1", "arg 2"]
        colors_     = [ORANGE, GREEN, RED, ACCENT, PURPLE]
        current_top = N - 1

        for val, col in zip(push_values, colors_):
            slot = stack_slots[current_top]
            fill = Rectangle(width=3.2, height=0.72,
                             fill_color=col, fill_opacity=0.22,
                             stroke_color=col, stroke_width=1.5)
            fill.move_to(slot)
            txt = Text(val, font="JetBrains Mono", color=col, font_size=18)
            txt.move_to(slot)
            rsp_ptr.put_start_and_end_on(
                RIGHT * 0.8, stack_slots[current_top].get_right() + LEFT * 0.01)
            rsp_lbl.next_to(rsp_ptr, RIGHT, buff=0.1)
            if current_top == N - 1:
                self.play(FadeIn(rsp_ptr, rsp_lbl))
            self.play(FadeIn(fill), Write(txt), run_time=0.55)
            current_top -= 1
            if current_top >= 0:
                new_end = stack_slots[current_top].get_right() + LEFT * 0.01
                self.play(rsp_ptr.animate.put_start_and_end_on(RIGHT * 0.8, new_end),
                          rsp_lbl.animate.next_to(rsp_ptr, RIGHT, buff=0.1),
                          run_time=0.4)

        caption = Text("Stack grows toward lower addresses",
                       font="JetBrains Mono", color=GRAY, font_size=20
                       ).shift(DOWN * 3.1)
        self.play(Write(caption))
        self.wait(2.5)

        # Show the C code + ASM side by side
        self.play(*[FadeOut(m) for m in self.mobjects])
        title_card(self, "Stack in Assembly", "sub rsp allocates space")

        asm_lines = [
            ("1139:", "55",             "push   rbp"),
            ("113a:", "48 89 e5",       "mov    rbp, rsp"),
            ("113d:", "48 83 ec 10",    "sub    rsp, 0x10        ; allocate locals"),
            ("1141:", "c7 45 fc 05…",   "mov    DWORD PTR [rbp-0x4], 0x5"),
            ("1152:", "e8 d9 fe ff ff", "call   puts@plt"),
            ("1157:", "b8 00 00 00 00", "mov    eax, 0x0"),
            ("115c:", "c9",             "leave"),
            ("115d:", "c3",             "ret"),
        ]
        asm_group = S02_HelloWorld._asm_block(asm_lines).scale(0.95).shift(UP * 0.3)
        self.play(FadeIn(asm_group))

        # Highlight sub rsp
        rows = asm_group.submobjects[1]
        self.play(rows[2].animate.set_color(ACCENT), run_time=0.5)
        note = Text("Reserves 16 bytes on the stack for local variable x",
                    font="JetBrains Mono", color=ACCENT, font_size=20
                    ).shift(DOWN * 2.8)
        self.play(Write(note))
        self.wait(2)
        self.play(*[FadeOut(m) for m in self.mobjects])


# ─────────────────────────────────────────────
#  5. The Heap
# ─────────────────────────────────────────────
class S05_Heap(Scene):
    def construct(self):
        title_card(self, "The Heap", "Dynamic Memory & malloc/free")

        # Memory layout diagram
        segments = [
            ("Stack  ↓", ORANGE, 1.2),
            ("  ...  ",  BG,     0.5),
            ("Heap   ↑", GREEN,  1.2),
            (".bss",     PURPLE, 0.55),
            (".data",    PURPLE, 0.55),
            (".text",    ACCENT, 0.55),
        ]
        layout = VGroup()
        for label, color, h in segments:
            rect = Rectangle(width=3.8, height=h,
                             fill_color=color, fill_opacity=0.18,
                             stroke_color=color if color != BG else GRAY,
                             stroke_width=1.5)
            lbl = Text(label, font="JetBrains Mono", color=color if color != BG else GRAY,
                       font_size=22)
            lbl.move_to(rect)
            layout.add(VGroup(rect, lbl))
        layout.arrange(DOWN, buff=0).shift(LEFT * 3.5)

        low_lbl  = Text("Low Address",  font="JetBrains Mono", color=GRAY, font_size=17
                        ).next_to(layout, DOWN, buff=0.2)
        high_lbl = Text("High Address", font="JetBrains Mono", color=GRAY, font_size=17
                        ).next_to(layout, UP, buff=0.2)
        self.play(FadeIn(layout), Write(low_lbl), Write(high_lbl), run_time=1.2)
        self.wait(0.6)

        # malloc/free sequence on the right
        steps = [
            ("char *buf = malloc(64);", GREEN,  "allocate 64 bytes on heap"),
            ("strcpy(buf, \"hello\");",  ORANGE, "write data into buffer"),
            ("free(buf);",              RED,    "return memory to allocator"),
        ]
        step_group = VGroup()
        for code, color, desc in steps:
            code_t = Text(code, font="JetBrains Mono", color=color, font_size=19)
            desc_t = Text(desc, font="JetBrains Mono", color=GRAY,  font_size=16)
            desc_t.next_to(code_t, DOWN, buff=0.12)
            step_group.add(VGroup(code_t, desc_t))
        step_group.arrange(DOWN, buff=0.5).shift(RIGHT * 2.2 + UP * 0.3)

        for step in step_group:
            self.play(FadeIn(step, shift=RIGHT * 0.3), run_time=0.7)
            self.wait(0.6)

        # Vulnerability callout
        vuln_box = RoundedRectangle(corner_radius=0.2, width=6.5, height=1.8,
                                   fill_color=RED, fill_opacity=0.1,
                                   stroke_color=RED, stroke_width=2)
        vuln_box.shift(DOWN * 2.8)
        vuln_txt = Text(
            "Forget free → Memory Leak\n"
            "free + reuse → Use-After-Free\n"
            "Overflow 64 bytes → Heap Overflow",
            font="JetBrains Mono", color=RED, font_size=17, line_spacing=1.3)
        vuln_txt.move_to(vuln_box)
        self.play(FadeIn(vuln_box), Write(vuln_txt), run_time=1.2)
        self.wait(2.5)
        self.play(*[FadeOut(m) for m in self.mobjects])


# ─────────────────────────────────────────────
#  6. Instruction Set
# ─────────────────────────────────────────────
class S06_Instructions(Scene):
    def construct(self):
        title_card(self, "CPU Instructions", "mov · lea · push · call · ret")

        categories = [
            ("Data Movement", [
                ("mov rax, rdx",      "copy rdx into rax"),
                ("mov rax, [rdx]",    "dereference: load value at addr rdx"),
                ("lea rdi, [rbx+0x10]","load address rbx+0x10 into rdi"),
            ], ACCENT),
            ("Arithmetic / Logic", [
                ("add rax, 0x4",  "rax = rax + 4"),
                ("sub rsp, 0x10", "grow stack by 16 bytes"),
                ("xor rax, rax",  "zero rax (optimised)"),
            ], GREEN),
            ("Stack", [
                ("push rbp", "decrement rsp; write rbp to [rsp]"),
                ("pop  rbp", "read [rsp] into rbp; increment rsp"),
            ], ORANGE),
            ("Control Flow", [
                ("call 0x401234", "push rip; jump to function"),
                ("ret",           "pop saved rip; resume caller"),
                ("jmp 0x401234",  "unconditional jump"),
                ("jz  / jnz",     "jump if Zero Flag set / not set"),
            ], PURPLE),
        ]

        for cat_name, instructions, color in categories:
            self.play(*[FadeOut(m) for m in self.mobjects], run_time=0.3)
            hdr = Text(cat_name, font="JetBrains Mono", color=color,
                       font_size=34, weight=BOLD).shift(UP * 3)
            self.play(Write(hdr))

            rows = VGroup()
            for instr, desc in instructions:
                instr_t = Text(instr, font="JetBrains Mono", color=color, font_size=24)
                desc_t  = Text(f"  →  {desc}", font="JetBrains Mono",
                               color=WHITE, font_size=20)
                row = VGroup(instr_t, desc_t).arrange(RIGHT, buff=0.3)
                rows.add(row)
            rows.arrange(DOWN, aligned_edge=LEFT, buff=0.4).shift(UP * 0.4)
            self.play(LaggedStart(*[FadeIn(r, shift=LEFT * 0.3) for r in rows],
                                  lag_ratio=0.25), run_time=1.2)
            self.wait(2.0)

        self.play(*[FadeOut(m) for m in self.mobjects])


# ─────────────────────────────────────────────
#  7. CPU Flags
# ─────────────────────────────────────────────
class S07_Flags(Scene):
    def construct(self):
        title_card(self, "CPU Flags", "EFLAGS register")

        # 16-bit flag register visual
        bits = list(range(15, -1, -1))
        important = {0: ("CF", RED), 2: ("PF", GRAY), 6: ("ZF", ACCENT),
                     7: ("SF", ORANGE), 11: ("OF", PURPLE)}

        cells = VGroup()
        for b in bits:
            color = important.get(b, ("", GRAY))[1] if b in important else GRAY
            rect = Square(side_length=0.55,
                          fill_color=color, fill_opacity=0.18,
                          stroke_color=color, stroke_width=1.5)
            bit_n = Text(str(b), font="JetBrains Mono",
                         color=color, font_size=13).move_to(rect)
            cells.add(VGroup(rect, bit_n))
        cells.arrange(RIGHT, buff=0.04).shift(UP * 1.8)
        self.play(FadeIn(cells), run_time=1.0)

        # Flag abbreviations below important bits
        for b, (abbr, color) in important.items():
            idx  = 15 - b
            cell = cells[idx]
            lbl  = Text(abbr, font="JetBrains Mono", color=color, font_size=18,
                        weight=BOLD)
            lbl.next_to(cell, DOWN, buff=0.15)
            self.play(FadeIn(lbl), run_time=0.3)

        self.wait(0.5)

        # cmp / jz example
        example = VGroup(
            Text("cmp rax, 0x5     ; sets ZF=1 if rax == 5",
                 font="JetBrains Mono", color=WHITE, font_size=21),
            Text("jz  target       ; jumps only if ZF=1",
                 font="JetBrains Mono", color=ACCENT, font_size=21),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.3).shift(DOWN * 0.4)

        bg = BackgroundRectangle(example, color="#161b22", fill_opacity=1,
                                  buff=0.25, corner_radius=0.15)
        self.play(FadeIn(bg), FadeIn(example), run_time=1.0)

        # Animate ZF cell lighting up
        zf_idx = 15 - 6
        zf_cell_rect = cells[zf_idx][0]
        self.play(zf_cell_rect.animate.set_fill(ACCENT, opacity=0.75), run_time=0.7)
        self.wait(0.5)
        self.play(zf_cell_rect.animate.set_fill(ACCENT, opacity=0.18), run_time=0.4)

        self.wait(2.0)
        self.play(*[FadeOut(m) for m in self.mobjects])


# ─────────────────────────────────────────────
#  8. Outro
# ─────────────────────────────────────────────
class S08_Outro(Scene):
    def construct(self):
        recap_items = [
            "C compiles to assembly, which becomes machine code",
            "Registers: rip, rsp, rbp, argument registers",
            "Calling convention: rdi → rsi → rdx → rcx → r8 → r9",
            "Stack: LIFO, managed by rsp/rbp",
            "Heap: dynamic memory via malloc/free",
            "Instructions: mov, lea, push/pop, call/ret, jz/jnz",
            "Flags register drives conditional branching",
        ]

        title = Text("Recap", font="JetBrains Mono", color=ACCENT,
                     font_size=44, weight=BOLD).shift(UP * 3.1)
        self.play(Write(title))

        items_grp = VGroup()
        for txt in recap_items:
            bullet = Text(f"• {txt}", font="JetBrains Mono",
                          color=WHITE, font_size=20)
            items_grp.add(bullet)
        items_grp.arrange(DOWN, aligned_edge=LEFT, buff=0.28).shift(UP * 0.5)

        self.play(LaggedStart(*[FadeIn(i, shift=LEFT * 0.2) for i in items_grp],
                              lag_ratio=0.18), run_time=2.5)
        self.wait(1.5)

        next_lbl = Text("Next: ELF Binary Structure",
                        font="JetBrains Mono", color=ORANGE, font_size=28,
                        weight=BOLD).shift(DOWN * 2.8)
        self.play(Write(next_lbl))
        self.wait(1.0)

        support = Text("buymeacoffee.com/mockingspectre",
                       font="JetBrains Mono", color=GRAY, font_size=18
                       ).shift(DOWN * 3.5)
        self.play(FadeIn(support))
        self.wait(3.0)
        self.play(FadeOut(*self.mobjects))


# ─────────────────────────────────────────────
#  Full video: concatenate all scenes
# ─────────────────────────────────────────────
class FullVideo(S01_Intro, S02_HelloWorld, S03_Registers,
                S04_Stack, S05_Heap, S06_Instructions,
                S07_Flags, S08_Outro):
    """Render all scenes back-to-back as a single video file."""

    def construct(self):
        S01_Intro.construct(self)
        S02_HelloWorld.construct(self)
        S03_Registers.construct(self)
        S04_Stack.construct(self)
        S05_Heap.construct(self)
        S06_Instructions.construct(self)
        S07_Flags.construct(self)
        S08_Outro.construct(self)
