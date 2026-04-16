+++
title = "The One Thing Nobody Tells You About WiFi Hotspots on Arch Linux"
description = "A minimal Arch install is great until NetworkManager silently fails to find a binary you didn't know you needed"
author = "mockingspectre"
date = 2026-04-16
[taxonomies]
tags = ["arch", "linux", "networking", "kde"]
+++

I spent longer than I'd like to admit trying to get a simple WiFi hotspot running on Arch. Not because it's hard — it genuinely isn't — but because of one missing piece that the NetworkManager documentation buries so deep you'd think it was classified.

For context: I'm running a minimal Arch Linux install with KDE Plasma. No bloat, no extras, just what I explicitly put there. Which, as it turns out, is exactly why this bit me.

Here's the whole story, and more importantly, the fix.

## It starts innocently enough

You fire up `nmcli`, throw together what looks like a perfectly reasonable hotspot command, and get slapped with this:

```
Error: Connection activation failed: IP configuration could not be reserved (no available address, timeout, etc.)
```

Vague. Unhelpful. The kind of error message that was clearly written by someone who never had to debug it.

Your first instinct is probably to check if your WiFi card even supports AP mode — reasonable. Mine does. Maybe NetworkManager picked the wrong interface — also reasonable, so you specify `ifname wlp61s0` explicitly. Still fails. You check for a conflicting `dnsmasq` service. It doesn't even exist on the system.

At this point the error message has told you nothing useful, and you're running out of obvious things to blame.

## The actual culprit

Dig into the NetworkManager journal and you'll find the real error hiding two lines below the surface:

```
device (wlp61s0): ip:shared4: could not start dnsmasq: Could not find "dnsmasq" binary
```

There it is. NetworkManager's hotspot mode uses `dnsmasq` internally to hand out IP addresses to devices that connect to your hotspot. It doesn't use the system `dnsmasq` service — it manages its own instance entirely in the background. But it does need the binary to actually exist on your machine.

On a minimal Arch install, it doesn't come pre-installed — and if you're not pulling in a full desktop environment with all its recommended packages, nothing drags it in for you either. So the whole thing silently falls apart at the IP configuration stage, and you get that useless generic error instead of "hey, install dnsmasq."

The fix is one line:

```bash
sudo pacman -S dnsmasq
```

Don't enable it, don't start it. Just having it on the system is enough. NetworkManager will find it and handle the rest.

## Getting internet to actually work

Once the hotspot is up, you'll notice connected devices get an IP but no internet. The hotspot being active and internet being shared are two separate things — your machine needs to be explicitly told to forward traffic between its WiFi and ethernet interfaces.

First, tell the kernel it's allowed to forward packets at all:

```bash
sudo sysctl -w net.ipv4.ip_forward=1
```

Then set up NAT so traffic from WiFi clients gets routed out through your ethernet connection and back:

```bash
sudo iptables -t nat -A POSTROUTING -o enp0s31f6 -j MASQUERADE
sudo iptables -A FORWARD -i wlp61s0 -o enp0s31f6 -j ACCEPT
sudo iptables -A FORWARD -i enp0s31f6 -o wlp61s0 -m state --state RELATED,ESTABLISHED -j ACCEPT
```

Swap out `enp0s31f6` and `wlp61s0` for whatever your ethernet and WiFi interfaces are actually named. After that, clients connecting to your hotspot will have full internet access.

These settings don't survive a reboot, so if you want them permanent, save them:

```bash
echo "net.ipv4.ip_forward=1" | sudo tee /etc/sysctl.d/99-ipforward.conf
sudo iptables-save | sudo tee /etc/iptables/iptables.rules
sudo systemctl enable iptables
```

## The short version

If your NetworkManager hotspot is failing on Arch, install `dnsmasq`. That's almost certainly it. The error message won't tell you that, the hotspot command won't tell you that, but the journal will — and now so does this article.

Everything else is just routing.