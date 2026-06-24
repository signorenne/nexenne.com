---
title: "openSUSE Tumbleweed review"
lang: en
translated_from: it
auto_translated: false
date: 2024-08-01
desc: "My experience with openSUSE Tumbleweed: rolling releases, KDE, stability and a few everyday trade-offs."
read: "6 min"
tags: ["OS"]
categories: ["GNU/Linux", "Analysis"]
image: "/blog/covers/opensuse_tubleweed_review.jpeg"
---
## Introduction
After leaving Arch Linux behind, I moved to openSUSE Tumbleweed, which eventually became my main operating system. I used it for software development, gaming, office work, and everyday use.

What I appreciate most is the balance between frequent updates and reliability. Tumbleweed is a rolling-release distribution, but its testing process removes many of the problems usually associated with that model.

After trying several distributions over the years, Tumbleweed stands out for its KDE Plasma integration, administration tools, and update quality. This article collects what worked well for me and the trade-offs I ran into.

## What works well
### Stable and bleeding-edge
openSUSE Tumbleweed is a rolling-release distribution that gives users the latest features and developments from the Linux world: kernel, drivers, desktop environments and up-to-date applications.

That is useful for advanced users, software developers, and gamers who need recent packages.

Because Tumbleweed is updated continuously, you do not need large version upgrades every six months as with some other GNU/Linux distributions.

This distribution does not rely on rigid periodic release cycles; it is based on Factory, openSUSE's development base, which is updated frequently.

Each update, which follows a strict industrial standard and a rigorous quality-assurance process, is published only after passing thorough tests and quality checks through the openQA platform.

In practice, every new package version is tested individually and together with other groups of versions, ensuring overall system consistency.

In addition, openSUSE uses a modern filesystem like Btrfs, which lets users take snapshots of the system state and roll back to a previous state when something goes wrong.

All of this makes Tumbleweed suitable for everyday use despite being a rolling release. Once installed and configured, it can be used continuously as long as it is kept updated.

### YaST and Snapper
Tumbleweed includes YaST, a very complete control panel.
YaST, short for Yet another Setup Tool, can manage users, printers, software sources, the boot loader, partitions, services, networking, virtualization, AppArmor, filesystem snapshots, and more.

Tumbleweed also ships Snapper, created by Arvin Schnell, to manage snapshots of Btrfs filesystem subvolumes and LVM thin-provisioned volumes.
Beyond creating and deleting snapshots, including scheduled and automatic ones, Snapper can compare snapshots and restore the differences between them.
In practice, it lets users view earlier versions of files and recover changes in a controlled way.

Together, YaST and Snapper make system administration easier and simplify recovery after a problematic update.

### Intuitive setup
Let's start with the installation. Tumbleweed's installer is, in my opinion, the most complete and straightforward one I have ever encountered.
It gives you full control over what will be installed and provides a default configuration that is more than sufficient for most users.
I personally prefer and always recommend enabling full-disk encryption and Logical Volume Management to manage physical resources more effectively.

Once the installation is finished, if you need third-party codecs, you just install opi, a front-end for openSUSE's Open Build Service.
To pull in all codecs at once, just use `opi codecs`, which enables new repositories and installs them.

If you need drivers for your NVIDIA graphics card, you can install them directly from YaST or via the simple `zypper install-new-recommends --repo NVIDIA` command.

## The downsides
One of Tumbleweed's main drawbacks is that it may not be compatible with some third-party kernel modules or proprietary drivers, especially for graphics cards. That's because the Linux kernel is updated very frequently in Tumbleweed and some external modules or drivers may not keep up with the changes, or may not be available at all.
The workaround is to compile such modules or drivers from source, or to avoid using them entirely.

Also, installing third-party software not in the repositories, even through YaST Software, triggers an integrity-check error. The error can be safely ignored and the software will still install correctly.

A sore point: the ongoing conflict between PackageKit and YaST Software. Just remove the PackageKit package and the problem disappears.

openSUSE is still a niche distribution, so third-party documentation is less abundant. The official documentation is excellent, although it can feel more concise than the documentation available for distributions like Fedora or Ubuntu.

I'll end with an annoyance rather than a serious problem. If you enable third-party repositories, especially Packman, you may run into package-version conflicts that block updates. Usually, waiting a few days before updating or using Flatpak versions of the affected applications is enough.

## Conclusion
In my experience, openSUSE Tumbleweed offers recent packages without sacrificing system reliability. openQA, Btrfs, Snapper, and YaST form a solid base for a rolling-release distribution.

The main compromises are external kernel modules and possible conflicts between repositories. To reduce those issues, I prefer limiting third-party repositories and using Flatpak for applications that need proprietary codecs. With those precautions, Tumbleweed has been a strong distribution for both work and everyday use.
