---
title: Knob1 · firmware and HMI consolidation
lang: en
translated_from: it
auto_translated: false
client: Work Louder · Canada
role: Embedded firmware developer
year: Since December 2025 · active maintenance
summary: "I contributed to the consolidation of Knob1 firmware and HMI, improving reliability, consistency, and maintainability without changing the identity of the product."
tags: [Embedded firmware, HMI, Maintenance, Reliability, Validation]
color: amber
accent: Firmware · HMI · product reliability
cover: /work/knob1/product.webp
spotlight: true
metrics:
  - { k: Product, v: Keyboard with display and two knobs }
  - { k: Contribution, v: Firmware and HMI consolidation }
  - { k: Goal, v: Reliability and maintainability }
  - { k: Status, v: Public product · active maintenance }
---

## A keyboard and control surface

Knob1 is a mechanical keyboard designed by Ben Fryc and developed by Work Louder. It combines a full keyboard, two programmable rotary controls, and a panoramic display for information, controls, and personalized content.

That combination makes Knob1 more than a conventional keyboard, but it also requires the interface, input, and device behavior to remain coherent throughout extended use.

![Knob1](/work/knob1/product.webp)

*Knob1, designed by Ben Fryc and developed by Work Louder.*

The public pages present a low-profile keyboard with two programmable knobs and a `310 × 100` pixel color display. The interface can show local information, timers, and wallpapers, while Work Louder Input adapts the keys and controls to each workflow.

![Public Knob1 experience: keyboard, two knobs, display, and configuration](/work/knob1/diagrams/public-experience.svg)

*Knob1 combines typing, physical adjustments, and visual information on one surface. The diagram uses public product functions only.*

## My contribution

I joined the project to contribute to the consolidation of the firmware and HMI.

My work involved:

* improving the overall reliability of the device;
* making the relationship between product state and displayed information more coherent;
* refining interface behavior during everyday use;
* consolidating shared functionality without losing the characteristics specific to Knob1;
* simplifying maintenance and future improvements;
* validating behavior on the physical device through repeated scenarios.

The goal was to reinforce the product without changing its experience unnecessarily. Users should continue to recognize Knob1 while being able to rely on more predictable behavior.

This kind of contribution is less visible than a new screen, but it is what allows the product to remain pleasant in everyday use and accept new possibilities without losing balance.

## A display that belongs to the keyboard

The display should not feel like an application placed on top of the keyboard. Its role should remain proportional: offer useful information and controls, then leave space for the main activity.

I worked on the HMI around several principles:

* readability at a brief glance;
* a clear relationship between what is turned and what changes;
* continuity when the interface moves between different content;
* visual feedback that matches the state of the product;
* customization that does not make the experience feel disordered.

These principles help the display become a natural part of the product rather than a separate surface.

## Working on the complete system

On a device that combines a display, physical controls, connectivity, and battery operation, a local change can influence the rest of the experience. I therefore approached Knob1 as one complete system.

This makes it possible to improve the product while keeping responsibilities clear and reducing the risk that a new feature makes existing behavior more fragile.

The goal is not to expose complexity, but to contain it. Users should be able to change content, use the knobs, move between desk and mobile use, and find coherent behavior without needing to understand what happens behind the interface.

## Quality emerges through repetition

Many aspects of an embedded product appear correct during a short test. Real quality emerges when the same actions are repeated, when different ways of using the device alternate, and when the interface remains active for longer periods.

Validation on Knob1 therefore considered scenarios shaped around use:

* repeated movement between content and controls;
* alternating between the keyboard and rotary controls;
* different configurations;
* extended sessions;
* changes that involve several parts of the experience.

Repetition is not only a way to find an error. It helps determine whether the behavior remains stable, readable, and natural over time.

## Improving without erasing character

Knob1 has a recognizable visual and physical identity. Consolidation should not flatten that character or turn the keyboard into a generic product.

I therefore separated what needed stronger foundations from what defined this specific keyboard. That makes it possible to reuse solid groundwork while keeping decisions about its interface, controls, and perceived character within the product.

## Outcome

My contribution made the firmware and HMI more solid, understandable, and ready for further iteration.

Knob1 represents the less visible but essential work required to support an embedded product over time: analysis, consolidation, validation, and attention to the quality of the complete experience.

The most important outcome is a product that remains recognizable while becoming better prepared for everyday use and continued evolution.

## What this project says about my work

Knob1 highlights:

* the ability to consolidate existing firmware and HMI;
* attention to perceived quality during extended use;
* design of the relationship between display and physical controls;
* management of complexity without transferring it to the user;
* maintenance shaped around product continuity.

## Official link

* [Work Louder · Knob1](https://worklouder.cc/knob1)
