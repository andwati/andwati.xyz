+++
title = "mmuctf 2025 writeup"
description = "mmuctf 2025 challenges writeup"
date = 2025-08-03
[taxonomies]
tags = ["ctf", "rev", "web", "forensics"]
+++


Over the weekend, I  had the opportunity to participate in the mmuctf 2025. It was an individual jeopardy style CTF targeted towards beginners and intermediate people in cybersecurity. This is a write-up to explore some challenges I did, or at least almost did.

## Welcome

>Through the shadows of the cave, at the door I had a zeal to get a welcome flag, but I couldn't see it though
I could hear it calling for me to get it. Happy hacking
{: .prompt-info }

This was a sanity check flag. I believe competitions pose such challenges that you can't get zero points. It's the same as flags in Discord servers, a flag after completing the feedback form, or just other free points.

The challenge description talked about the `door`, my first instinct was to view the source of the front page. I got this html comment with what looked liked a base64 encoded string `<!--bW11Y3Rme3dlbGNvbWVfZmxhZ19hZGlvc19NdWNoQGNob30= -->`

```terminal
┌──(mockingspectre㉿blackout)-[~/ctf/mmuctf2025]
└─$ echo -n "bW11Y3Rme3dlbGNvbWVfZmxhZ19hZGlvc19NdWNoQGNob30=" | base64 -d
mmuctf{welcome_flag_adios_Much@cho}   
```

## My First App

>Our intern dev swears this app’s secure...
{: .prompt-info}

This was a web challenge with an account creation form. Let's fire up Burp. The account creation request didn't seem suspicious for now, so I sent it to the repeater to abuse it some more. The response seemed interesting, the user id was in the query parameter: `GET /profile.php?id=5 HTTP/1.1`. This was a nice candidate for an Insecure Direct Object Reference(IDOR). I tried repeating the request with values from 0-4. The flag was at 1, the admin user's account.

```text
mmuctf{1d0r_4dm1n_4cc3ss_1s_c0mpr0m1s3d}
```

## Ledilect

>Sometimes the path you take is just a jump away.
{: .prompt-info}

This was a simple one, I knew what the challenge wanted, but I couldn't get myself to exploit it, definitely a skill issue. The webapp had a landing page that had a button that made this request:

```text
GET /portal/jump.php?url=https://example.com HTTP/1.1
Host: redacted
User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Accept-Language: en-US, en;q=0.5
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
Referer: redacted
Cookie: PHPSESSID=ce7743f6cd447d7a1ee94e230c3d9cdb
Upgrade-Insecure-Requests: 1
Priority: u=0, i
```

Looking at that, I suspected an open redirect vulnerability, but I don't know anything about this bug class. I let it rest.

## Meet my X

>Iｎ tｈｅ�days оｆ cοｍfoｒt ｉ ｍeｔ tｈis ｇｉrl ａｔ thｅ Ｊobleｓs соrｎｅr. Аt ｔｈe�doоrs ａnd windows of iddleness i approached, oops she smiled and thats how i knew she was the one. I guess thatsss whyyy i learned on getting Flags because be warned she later left me at first it feels like a green flag i guess no life was there on blood(heart_break)
{: .prompt-info}

This challenge involved homoglyphs,  a character or a sequence of characters that looks very similar or identical to another character or sequence of characters, but has a different meaning, encoding, or origin.

A sentence might look normal, but if you copy it into a text editor that shows Unicode details or a specialized homoglyph detector, you'll see different underlying character codes.

I used these online decoders, <https://wulfsige.com/crypto/> and <https://holloway.nz/steg/> to get the flag:

```text
mmuctf{oops_twitter_steg_1s_fun}
```

## Shadow

>Look beyond the appearance, perhaps their numerical essence will guide you to the flag.
Can you reveal what lurks in the shadow?
{: .prompt-info}

This was another stego challenge; there is an image with what looks like a color palette. The description hints at 'numerical essence', so it might be something to deal with the hex values of the colors. I used this site <https://imagecolorpicker.com/> to extract the hex values.

```text
#6d6d75
#637466
#7b346c
#773479
#355f68
#316464
#336e5f
#316e35
#64335f
#6d337d
```

Decoded becomes

```text
mmuctf{4lw4y5_h1dd3n_1n5d3_m3}
```

## Revealme

>We found this mysterious executable on an old USB stick... Can you figure out how to get it to reveal the flag?
{: .prompt-info}

The provided file is an ELF executable binary.

```sh
┌──(mockingspectre㉿blackout)-[~/ctf/mmuctf2025]
└─$ file revealme
revealme: ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV), dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, BuildID[sha1]=d8546bb2c10c0226384fb2771684af9bc150b55e, for GNU/Linux 3.2.0, stripped
```

```console
┌──(mockingspectre㉿blackout)-[~/ctf/mmuctf2025]
└─$ checksec --file=revealme
RELRO           STACK CANARY      NX            PIE             RPATH      RUNPATH      Symbols         FORTIFY Fortified       Fortifiable     FILE
Partial RELRO   No canary found   NX enabled    PIE enabled     No RPATH   No RUNPATH   No Symbols        No    0               2               revealme
```

Opening it with Binary Ninja gives us a quick win:

```asm
00401179    int32_t main(int32_t argc, char** argv, char** envp)


00401179  55                 push    rbp {__saved_rbp}
0040117a  4889e5             mov     rbp, rsp {__saved_rbp}
0040117d  4883ec70           sub     rsp, 0x70
00401181  488d05800e0000     lea     rax, [rel data_402008]
00401188  4889c7             mov     rdi, rax  {data_402008, "Enter the secret passphrase: "}
0040118b  b800000000         mov     eax, 0x0
00401190  e8abfeffff         call    printf
00401195  488b15a42e0000     mov     rdx, qword [rel stdin]
0040119c  488d4590           lea     rax, [rbp-0x70 {buf}]
004011a0  be64000000         mov     esi, 0x64
004011a5  4889c7             mov     rdi, rax {buf}
004011a8  e8b3feffff         call    fgets
004011ad  488d4590           lea     rax, [rbp-0x70 {buf}]
004011b1  488d156e0e0000     lea     rdx, [rel data_402026]
004011b8  4889d6             mov     rsi, rdx  {data_402026}
004011bb  4889c7             mov     rdi, rax {buf}
004011be  e88dfeffff         call    strcspn
004011c3  c644059000         mov     byte [rbp+rax-0x70 {buf}], 0x0
004011c8  488d4590           lea     rax, [rbp-0x70 {buf}]
004011cc  488d15550e0000     lea     rdx, [rel data_402028]
004011d3  4889d6             mov     rsi, rdx  {data_402028, "OpenSesame123!"}
004011d6  4889c7             mov     rdi, rax {buf}
004011d9  e892feffff         call    strcmp
004011de  85c0               test    eax, eax
004011e0  7511               jne     0x4011f3


004011e2  488d054f0e0000     lea     rax, [rel data_402038]
004011e9  4889c7             mov     rdi, rax  {data_402038, "Correct! The flag is: mmuctf{r3v3rs1ng_st4rt3r}"}
004011ec  e83ffeffff         call    puts
004011f1  eb0f               jmp     0x401202


004011f3  488d056e0e0000     lea     rax, [rel data_402068]
004011fa  4889c7             mov     rdi, rax  {data_402068, "Nope, try again."}
004011fd  e82efeffff         call    puts


00401202  b800000000         mov     eax, 0x0
00401207  c9                 leave    {__saved_rbp}
00401208  c3                 retn     {__return_addr}
```

Flag:

```text
mmuctf{r3v3rs1ng_st4rt3r}
```

## Flicker

>An ordinary looking Android app... or is it?
{: .prompt-info}

The provided app is an Android APK. Let's fire up jadx-gui. The package name is `com.example.blink`. There is an interesting class `r2d2`. In the onCreate method, there is an image string variable that seems to contain base64 image data.

```terminal
┌──(mockingspectre㉿blackout)-[~/ctf/mmuctf2025]
└─$ cat output.txt | base64 -d > decoded_image.png
```

flag:

```text
CTF{PUCKMAN}
```

## Open_Secrets

>Someone trusted the wrong site and network didn’t forget. Can you piece together what was left behind?
Some people still think locks are optional on digital doors.*
{: .prompt-info}

The provided file was a network capture pcap file. For people who don't know, pcap (a packet capture) consists of an application programming interface (API) for capturing network traffic.The challenge title and filename hint at unencrypted traffic. Open up Wireshark and apply an HTTP filter. There is an HTTP stream that leaks the flag:

```text
mmuctf{plaintext_login_leak}
```

## C-x C-s

> Ugh, I keep typing ^x ^s in my shell instead of saving, should’ve stuck with Emacs
{: .prompt-info}

This one made me mad. I thought I had the flag, but I couldn't get it. The provided file is a PCAP file. Another network forensics challenge, or so I thought.

opened the file with Wireshark packet and noticed a new kind of communication, to be honest, I didn't know this was possible until I understood what was happening...

I found some articles dealing with this

- <https://abawazeeer.medium.com/kaizen-ctf-2018-reverse-engineer-usb-keystrok-from-pcap-file-2412351679f4>
- <https://res260.medium.com/usb-pcap-forensics-barcode-scanner-nsec-ctf-2021-writeup-part-1-3-b0a5392c9313>
- <https://steemit.com/reverseengineering/@nileshevrywhr/auth0-ctf-reverse-engineering-usb-keystrokes-from-pcaps>

The source and destination use object IDs for communication, something I gathered when reading about the SNMP
protocol, USB(Universal Serial Bus)
it's apparent I'm not dealing with any 802.x traffic

Interrupts happen whenever you press a key or click a button, anything that "interrupts" the CPU, after which it has to process your input. Each URB_INTERRUPT in the file corresponds to a key pressed, and the Leftover Capture Data field shows the hex value of the key in 8-byte format.

Creating a filter to list all interrupt communication with non-empty 8 bytes

```text
usb.transfer_type == 0x01
```

```text
usb.transfer_type == 0x01 && usb.dst == "host" && !(usb.capdata == 00:00:00:00:00:00:00:00)
```

Crafting a tshark command to get the leftover capture data for the above filters and redirect it into a text file

```text
tshark -r log.pcap -Tfields -Eseparator=, -e thekey.pcapng -Y 'usb.transfer_type == 0x01 && usb.dst == "host" && !(usb.capdata == 00:00:00:00:00:00:00:00)' | sed 's/://g' > usb.capdata
```

```terminal
┌──(mockingspectre㉿blackout)-[~/ctf/mmuctf2025]
└─$ tshark -r thekey.pcapng -Tfields -Eseparator=, -e usb.capdata -Y 'usb.transfer_type == 0x01 && usb.dst == "host" && !(usb.capdata == 00:00:00:00:00:00:00:00)' | sed 's/://g' > usb.capdata
                                                                                                             
┌──(mockingspectre㉿blackout)-[~/ctf/mmuctf2025]
└─$ cat usb.capdata                                                                                                                                      
0000190000000000
00000c0000000000
00000c1000000000
0000102c00000000
00002c0000000000
0000090000000000
00000f0000000000
0000040000000000
0000040a00000000
................
```

Python script to decode the hex values to strings:

```python
keyboard = {
   2: "PostFail",    4: "a",    5: "b",    6: "c",    7: "d",    8: "e",    9: "f",    10: "g",    11: "h",    12: "i",    13: "j",    14: "k",    15: "l",    16: "m",    17: "n",    18: "o",    19: "p",    20: "q",    21: "r",    22: "s",    23: "t",    24: "u",    25: "v",    26: "w",    27: "x",    28: "y",    29: "z",    30: "1",    31: "2",    32: "3",    33: "4",    34: "5",    35: "6",    36: "7",    37: "8",    38: "9",    39: "0",    40: "Enter",    41: "esc",    2: "del",    43: "tab",    44: "space",    45: "-",    47: "[",    48: "]",    51: "DownArrow",    54: "1",    55: "*",    56: "/",    57: "CapsLock",    79: "RightArrow",    80: "LeftArrow"
}


with open("usb.capdata") as file:
   i = 1
   for line in file:
       bytesArray = bytearray.fromhex(line.strip())
       for byte in bytesArray:
           if byte != 0:
               keyVal = int(byte)


       if keyVal in keyboard:
           print(keyboard[keyVal])
       else:
           print("no map found for this value: " + str(keyVal))


   i += 1
```

Running the code outputs what seems to be Vim motions. I wasn't able to decipher this to a correct flag:

```text
v
i
m
space
space
f
l
a
g
g
*
t
t
x
t
Enter
i
3
t
t
h
e
space
f
l
a
g
g
space
i
s
space
c
t
f
esc
v
b
3
u
u
3
a
3
[
[
m
y
3
-
3
f
a
v
o
r
i
t
e
e
3
-
e
d
i
t
o
r
3
-
3
i
s
3
-
v
i
m
3
]
esc
h
h
h
h
h
h
h
h
h
h
h
h
h
h
h
h
h
h
h
a
u
esc
v
i
3
[
3
3
u
3
esc
3
DownArrow
DownArrow
w
q
Enter
a
tab
a
e
```

These are the challenges I had the time to tackle. if you have any insights or suggestions. Share them in the comments