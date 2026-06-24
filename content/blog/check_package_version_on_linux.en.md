---
title: "How to check a package version on GNU/Linux"
lang: en
translated_from: it
auto_translated: false
date: 2024-04-09
desc: "A quick way to check an installed package version without running the binary directly."
read: "1 min"
tags: ["GNU/Linux", "HowTo", "Administration"]
categories: ["Management", "Tutorial"]
image: "/blog/covers/check_package_version_on_linux.jpg"
---
## Introduction
After the backdoor in the XZ Utils package was disclosed ([CVE-2024-3094](https://nvd.nist.gov/vuln/detail/CVE-2024-3094)),
I noticed many people suggesting `xz --version` to check the installed package version instead of asking the distribution's package manager.

If an executable may be compromised, it is better not to run it just to learn its version. The package manager can provide the same information without executing the binary.

So let's look at how to check the version of an installed package on GNU/Linux systems.
For convenience I split the distributions by package manager.

Note that the commands below explicitly filter for packages with `xz` in the name.

## Debian
This works on every Debian-based distribution.

```bash
# apt
apt list xz

# or with more details
apt show xz

# or with dpkg
dpkg-query -l '*xz*'

# or
dpkg-query -l | grep xz
```

## Fedora
This applies to Fedora and to distributions that use RPM and DNF.
You can also use RPM Package Manager (RPM).

```bash
# dnf
dnf list installed xz*

# or
dnf list installed | grep xz

# or with yum
yum list installed | grep xz

# or via RPM
rpm -qa | grep xz
```

## Arch Linux
This also works for Arch-based distributions, including Manjaro, EndeavourOS and SteamOS.

```bash
# pacman
pacman -Qs xz

# or
pacman -Q | grep xz
```

## openSUSE Tumbleweed
These commands are also valid for SUSE- and openSUSE-based distributions like GeckoLinux and Linux Kamarada.
You can also use RPM.

```bash
# zypper
zypper info xz

# or
rpm -qa | grep xz
```
