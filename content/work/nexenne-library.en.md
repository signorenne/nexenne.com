---
title: Nexenne Library · modular C++23 libraries
lang: en
translated_from: it
auto_translated: false
client: Personal · open source
role: Software architect and developer
year: 2026 → ongoing
summary: "A ground-up rewrite of a C++23 library collection, organized around independent modules, standard-library-style APIs, composable CMake targets, tests, and documentation."
tags: [C++23, CMake, Doctest, Containers, Utilities, Open source]
color: coral
accent: C++23 · independent modules · STL-first
metrics:
  - { k: Repo, v: github.com/signorenne/nexenne }
  - { k: Stack, v: C++23 · CMake · Doctest }
  - { k: Status, v: Active development }
---

## Why I rewrote it

Enne 2D began as an experimental engine and gradually accumulated components with very different responsibilities. I archived that project and started Nexenne as a complete rewrite, rebuilt as a set of independent libraries rather than a single framework.

The goal is to build modern C++ foundations with focused interfaces, explicit behavior, and controlled dependencies. The strongest ideas from the previous project are redesigned for this architecture instead of being carried over without critical review.

## Modular architecture

Each area is packaged as a separate component and CMake target under the `nexenne` namespace. Consumers can link only the modules they need, keeping dependencies and integration costs explicit.

The modules currently available cover general utilities, containers, time, and random-number functionality. APIs follow standard-library conventions where practical, making types, iterators, and algorithms familiar without hiding how they behave.

## Quality and maintenance

The library includes Doctest coverage, CMake presets, and configurations for AddressSanitizer and UndefinedBehaviorSanitizer. Examples and documentation are developed alongside the APIs because they help define each public contract precisely.

This approach allows internal implementations to evolve while behavior, compatibility, and memory assumptions remain verifiable.

## Project status

Nexenne is under active development. The rewrite will take time because each component is redesigned and introduced only when its responsibilities are clear enough for it to remain a standalone library.

## Links

- Source: [github.com/signorenne/nexenne](https://github.com/signorenne/nexenne)
