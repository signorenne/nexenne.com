---
title: Codex Micro · firmware and product UX
lang: en
translated_from: it
auto_translated: false
client: Work Louder · public collaboration with OpenAI
role: Firmware and product UX developer
year: July 2026
summary: "Through Work Louder, I contributed to the firmware and experience of Codex Micro, turning Codex workflows into clear and coherent physical interactions."
tags: [Embedded firmware, Product UX, HMI, Integration, Validation]
color: cyan
accent: Embedded firmware · physical interaction · product UX
cover: /work/codex-micro/product.webp
spotlight: true
feature: true
metrics:
  - { k: Collaboration, v: Work Louder · OpenAI }
  - { k: Product, v: Physical controller for Codex }
  - { k: Contribution, v: Firmware and product UX }
  - { k: Status, v: Limited edition · sold out }
---

Through Work Louder, I contributed to the architecture, development, and refinement of the Codex Micro firmware. Codex Micro is the physical controller created as part of the public collaboration between Work Louder and OpenAI.

My work connected the device controls to Codex: handling keys, the rotary encoder, the joystick, and the touch sensor; contributing to the RPC communication with the application; interpreting incoming state; and coordinating visual feedback.

The goal, however, was not simply to make every input produce the correct command. All these elements needed to behave as parts of the same interface and create an experience that felt understandable, coherent, and unobtrusive.

## A physical controller for Codex

Codex Micro brings useful Codex actions and information onto the desk through thirteen mechanical keys, a rotary encoder, a planar joystick, a touch sensor, and RGB lighting.

The product does not replace the application. It provides a physical point of access to recurring workflows and makes it possible to understand at a glance whether a chat is thinking, complete, waiting for input, or reporting an error.

![Codex Micro](/work/codex-micro/product.webp)

*Codex Micro, created by Work Louder in collaboration with OpenAI.*

The public experience is built around four main groups of controls:

- **Agent Keys** represent up to six chats and communicate their state through color;
- **Command Keys** keep frequent actions close, including accept, reject, push-to-talk, and starting a new chat;
- the **dial** adjusts reasoning effort to match the current task;
- the **joystick** launches configurable skills and workflows, such as reviewing a pull request, debugging an error, or refactoring code.

![Public Codex Micro experience: physical controls, Codex functions, and the outcome for the developer](/work/codex-micro/diagrams/public-experience.svg)

*The public product functions converge into a more physical and immediate workflow. The diagram describes the officially presented experience, not the internal architecture.*

Codex Micro connects through USB-C or Bluetooth and is integrated directly into the Codex desktop experience. Work Louder Input extends the general device configuration with custom shortcuts and six programmable layers.

These features describe what the person sees. Underneath that experience, the firmware has to keep physical inputs, application state, operating modes, and visual feedback synchronized.

## My contribution

As part of the Work Louder team, I worked on the firmware and the overall product behavior.

More specifically, my work included:

- defining and refining the main firmware architecture and logic;
- handling input from the keys, rotary encoder, joystick, and touch sensor;
- turning physical input into events consistent with the active mode and layer;
- contributing to the RPC interface used to exchange commands, configuration, and state with Codex;
- interpreting and validating information received from the application;
- developing new layers for the LED system;
- coordinating agent state, interaction feedback, connection modes, and temporary indications;
- testing and refining behavior on the physical device with the wider team.

The main challenge was keeping a product that connects several layers simple: hardware, firmware, the host connection, Codex state, configuration, and physical interaction.

A problem in one of these stages does not necessarily cause an obvious crash. It may appear as a color that no longer matches its chat, a command assigned to the wrong control, feedback that arrives too late, or a mode that remains active longer than intended. This is why the behavior had to be treated as one system.

## From physical input to product behavior

A key press should not immediately translate into a rigidly assigned function.

Before deciding what to do, the firmware needs to understand:

- which control generated the event;
- whether it is a press, release, rotation, or movement;
- which layer or mode is active;
- whether the input belongs to the dedicated Codex experience or to the general configuration;
- which local state needs to change;
- which information needs to be sent to the computer;
- which feedback should appear on the device.

I therefore worked on transforming hardware input into clearer internal events that were independent from the individual component.

This separation makes the firmware easier to understand and allows the product logic to work in terms of intent: selecting a chat, executing a command, changing mode, or adjusting a value, instead of depending directly on pins, readings, and electrical details.

It is also important for consistency. The same gesture must produce a predictable response, while different gestures may need different treatment. For example, the public documentation distinguishes a single press from a double press on an Agent Key: the former selects a chat in the background, while the latter brings Codex to the foreground. The firmware needs to recognize that distinction without making the interaction feel slow or ambiguous.

## The RPC interface between Codex and the device

Codex Micro is not only a peripheral that sends shortcuts. It must also receive information from the application and turn it into physical state.

The RPC communication forms the boundary between these two environments.

On one side, Codex knows about chats, activities, configuration, and available actions. On the other, the firmware knows about keys, the encoder, the joystick, connection modes, and LEDs. The interface allows both systems to exchange information without mixing their responsibilities.

In the general flow:

1. Codex sends a state update or configuration to the device;
2. the firmware receives the message through the RPC interface;
3. the data is interpreted and checked before the internal state changes;
4. the application logic decides which parts of the device need to update;
5. the output system changes the visual feedback or control behavior;
6. when the user interacts with the device, the flow runs in the other direction and the event is sent back to Codex.

I contributed to this interface and to the handling of information coming from Codex, keeping communication, interpretation, and behavior separate.

This distinction prevents protocol details from spreading directly into the input logic or LED system. It also makes missing data, out-of-order updates, unavailable state, and configuration changes easier to handle.

For accuracy, this page describes the public system flow and responsibilities without disclosing internal protocol or implementation details.

## Giving Codex state a physical form

An application can use windows, text, notifications, and history. An object on the desk has a much smaller set of signals.

For the Agent Keys, the public RGB legend maps colors to specific states:

- white for an idle chat;
- blue while it is thinking;
- green when the work is complete;
- amber when input is required;
- red when an error occurs;
- off when no chat is assigned.

Showing a color, however, is only the final step.

The firmware first needs to receive the correct state, associate it with the corresponding control, and decide whether to display it immediately or allow temporary feedback to take priority for a short time.

This is why I worked on new LED layers. The goal was to separate different responsibilities, including:

- persistent chat state;
- the active mode or layer;
- USB-C or Bluetooth connection state;
- immediate confirmation of an input;
- temporary indications;
- conditions that require attention.

Layers allow the final output to be composed without losing the underlying state. A short animation can confirm an action and then reveal the chat state again. In the same way, a configuration mode can take priority for as long as needed without deleting information received from Codex.

The important part is not merely assigning different colors. It is defining priority, duration, and exit conditions so that feedback remains stable and predictable.

## An experience built around real work

I treated Codex Micro as one product, not as a collection of shortcuts.

Keys, light, movement, and device response needed to use the same language. Each control had to suggest the kind of action it could perform, while each response had to confirm what happened without requiring the person to keep watching the controller.

This meant answering questions that appear simple but have a direct impact on the experience:

- which state deserves to remain visible?
- when is temporary confirmation genuinely useful?
- which feedback can be understood at a glance?
- what should happen when Codex is unavailable or the device changes connection?
- how should dedicated features and configurable layers remain coherent?
- when should the device communicate, and when should it remain quiet?

In this product, UX is not a separate stage after firmware development. It is the result of decisions about timing, priority, transition, and the meaning of each response.

## Configuration without losing product identity

Codex Micro provides dedicated features, but it can also adapt to different workflows.

Configurability creates a tradeoff. A controller should let people organize their work, but it still needs to be understandable as soon as it is connected and cannot lose the functions that define its identity.

The six programmable layers in Work Louder Input can group shortcuts and actions. The touch sensor and dedicated indicators make the active layer visible, while AppSense can automatically associate a layer with the application currently in focus.

In firmware, this flexibility requires at least three concepts to remain separate:

- the physical control being used;
- the function assigned in the current context;
- the feedback required to make that context visible.

Keeping these concepts separate makes it possible to change configuration without rewriting the logic for each component. It also reduces the risk that a customization interferes with state coming from Codex.

## Validating on the physical device

The behavior of a controller cannot be evaluated only by reading the code.

Timing that looks correct on paper may feel slow during use. A color that is distinct on a screen may become ambiguous through the product diffuser. A double press may pass an automated test and still feel unnatural in practice.

The work therefore progressed through a continuous cycle:

1. define the expected behavior;
2. implement it in firmware;
3. test it on the physical device;
4. compare it with the Codex workflow;
5. observe ambiguity, delay, or overlap;
6. refine logic, priority, and feedback with the team.

This comparison between code and product guided many decisions. The goal was not only to verify that the device worked, but also to make sure its behavior was understandable.

## Outcome

The work contributed to a compact and recognizable controller built around Codex workflows and officially presented on July 15, 2026 as part of the collaboration between OpenAI and Work Louder.

The result connects:

- the state of up to six chats;
- frequent actions;
- configurable skills;
- reasoning-effort control;
- customizable layers;
- RGB feedback;
- USB-C and Bluetooth connectivity.

From a firmware perspective, these are not isolated features. They share input, state, communication, and output, so they need to follow one coherent model.

This is the part of embedded development that I find most interesting: connecting hardware and software until the technical complexity disappears from the final experience.

## A product built together

I am proud to have contributed to Codex Micro through Work Louder as part of the public collaboration with OpenAI.

I am grateful to the Work Louder team and everyone involved in the project for the continuous exchange across firmware, hardware, product, and interaction. That shared work is what made it possible to turn a set of physical controls into one coherent experience.

## What this project says about my work

Codex Micro brings together several skills that I contribute to embedded projects:

- product-oriented firmware architecture and development;
- handling and abstraction of different physical inputs;
- RPC integration between an application and a device;
- modeling state received from an external system;
- composition and priority in LED feedback;
- interaction design across software and physical controls;
- validation and refinement on real hardware;
- collaboration across teams and disciplines.

The project shows how firmware truly becomes part of a product when every technical response carries a clear meaning for the person using it.

## Official links

- [OpenAI · Codex Micro](https://openai.com/supply/co-lab/work-louder/)
- [OpenAI · What's new in Codex](https://learn.chatgpt.com/docs/whats-new)
- [Work Louder · Codex Micro](https://worklouder.cc/codex-micro)
- [Work Louder · Codex Micro setup](https://worklouder.cc/openai-micro-setup)
