---
title: "USB host or charger? VBUS, enumeration, and routing in embedded devices"
lang: en
translated_from: it
auto_translated: false
date: 2026-07-27
lastmod: 2026-07-27
desc: "How to distinguish a USB host from a charger using VBUS, enumeration, TinyUSB, and a probe-then-commit policy."
read: "40 min"
tags: ["USB", "TinyUSB", "Firmware", "Embedded", "BLE"]
categories: ["Embedded", "Tutorial"]
image: "/blog/covers/usb_vbus_enumerazione_routing.webp"
---

## Abstract

While developing a battery-powered embedded device capable of communicating through both BLE and USB, I ran into an apparently trivial problem: how can we distinguish a real USB host from a charger connected only to power the device?

The first solution was based on VBUS. Whenever USB voltage became present, the firmware automatically moved the input route from BLE to USB. The reasoning seemed sensible: the cable is connected, so we can use USB.

Not quite.

A wall charger, a power bank, or a charge-only cable can provide power without offering a usable data channel. In this scenario, the device keeps running, but the route is moved toward a USB connection that has no host to receive its reports. From the user's perspective, the input simply appears to disappear.

The problem comes from confusing signals that belong to different layers. VBUS proves that power is present. The pull-up on the data lines indicates that the device has presented itself on the bus. A bus reset and the first setup packets prove that a host has started communicating. Finally, `SET_CONFIGURATION` with a non-zero value indicates that the device has entered the **Configured** state and that the endpoints of the selected classes can be used normally.[^usb-concepts]

These states are related, but they are not equivalent. The bug appears precisely when one of them is promoted to an authority over all the others.

In this article, we will therefore examine how USB works from the perspective of embedded firmware: VBUS, D+ and D−, USB Type-C CC pins, host and device roles, bus reset, control endpoints, descriptors, enumeration, and self-powered devices. We will then use these concepts to build a **probe-then-commit** mechanism in which USB is presented temporarily, but the application route is adopted only after the host has genuinely configured the device.

The goal is not to rewrite the USB specification. It is to build a mental model precise enough to choose, for each decision, the signal that actually contains the required information.

## The concrete problem

Suppose we have a device with two communication channels:

- BLE, normally used while the device is running from its battery;
- USB HID, available when the device is connected to a computer.

A naive policy reduces everything to the shortcut `VBUS present → cable connected → USB route`.

The limitation is that VBUS describes only the power path. It does not prove that, on the other side of the cable, there is a host capable of enumerating the device and polling the HID endpoints.

The same voltage may come from:

- a computer;
- a USB hub with host functionality;
- a wall charger;
- a power bank;
- a charging port with no data support;
- a cable carrying only VBUS and GND.

In the first and second cases, switching to USB may be correct. In the others, the route is moved toward a dead channel.

The problem is especially visible with HID devices. The firmware may continue reading buttons, encoders, or sensors and may even prepare the reports correctly. USB, however, remains a host-controlled bus: an interrupt `IN` endpoint is serviced when the host polls it according to the declared interval, not when the device independently decides to transmit.[^hid11] If no host schedules those transactions, the reports go nowhere.

The first rule is therefore simple:

> VBUS may start a connection attempt, but it should not authorize adoption of the USB route by itself.

To understand which signal to use, however, we first need to separate the different layers of the connection.

## USB is not just a connector

In everyday language, we use the word USB to refer simultaneously to:

- a connector;
- a cable;
- a supply voltage;
- a differential pair;
- a protocol;
- a class such as HID, CDC, or MSC;
- a software stack;
- the controller integrated into the microcontroller.

These elements work together, but they answer different questions.

A USB Type-C connector, for example, does not automatically guarantee that USB 3.x, USB4, Power Delivery, or even USB 2.0 data is available. Capabilities depend on the port, controller, and cable.

Likewise, detecting VBUS does not mean that a USB packet has been received. It only means that the sensing circuit has detected a power source.

For convenience, we can organize the problem into layers:

![Layers of an embedded USB connection, from the connector to application policy](/blog/images/usb_vbus_enumerazione_routing/usb-layers-en.svg)

*Each layer answers a different question. A valid signal lower in the chain does not automatically authorize decisions at the higher layers.*

A regression often appears when a signal belonging to one layer is used as proof for the next one. It is useful to think of each layer as having limited authority: VBUS can answer questions about power; EP0 can prove that control traffic exists; configuration can prove that the link has been accepted by the host; only the product policy can decide which route to adopt.

## Host and device: USB is an asymmetric bus

USB is controlled by the host. TinyUSB summarizes this model clearly: the host enumerates, configures, and initiates all communication; the device responds to requests and cannot start a transaction on the bus.[^usb-concepts]

The host:

- detects that a peripheral has attached;
- performs a bus reset;
- assigns an address;
- reads descriptors;
- selects a configuration;
- schedules transactions;
- binds class drivers.

The device, on the other hand, exposes descriptors and endpoints and responds to the requests it receives.

This distinction is fundamental. A peripheral does not use the bus like a UART and cannot transmit freely whenever it wants. Even when data is ready, it must wait for a transaction initiated by the host.

### IN and OUT are defined from the host's point of view

The terminology may initially appear reversed:

- an `IN` endpoint carries data from the device to the host;
- an `OUT` endpoint carries data from the host to the device.

A keyboard, for example, normally sends reports through an interrupt `IN` endpoint. The firmware prepares the report, but the host periodically polls the endpoint.

Consequently, a device connected to a charger may be powered, read inputs, and update LEDs, yet still have no USB recipient.

## VBUS, GND, D+, and D−

In a USB 2.0 connection, we find four fundamental signals:

| Signal | Function |
|---|---|
| `VBUS` | Carries power and makes it possible to detect the presence of a source. |
| `GND` | Provides the electrical reference and the return path for current. |
| `D+` | First line of the USB 2.0 differential pair. |
| `D-` | Second line of the USB 2.0 differential pair. |

D+ and D− carry data as a differential pair. VBUS belongs instead to the power path.

### What VBUS proves

VBUS proves that a source is making power available on the USB connection.

It does not prove:

- that D+ and D− are physically wired;
- that the cable supports data;
- that a host exists on the other side;
- that the host has detected the device;
- that a bus reset has occurred;
- that the host has selected a configuration;
- that an HID class is ready.

A power bank can therefore provide perfectly valid VBUS without containing any host controller. A charge-only cable can carry VBUS and GND but no working data pair.

In short, VBUS is proof of power. It is not proof of communication. In self-powered devices, it is also an essential signal for recognizing attach and detach, but the fact that it is necessary does not make it sufficient to declare the data channel available.[^esp-self-powered]

## What USB Type-C adds

USB Type-C adds, among other things, the **Configuration Channel** pins, normally abbreviated as `CC`. The state machines on CC resolve attach, Source/Sink roles, and the initial DFP/UFP data roles before higher-level USB functions are used.[^typec-overview]

The CC pins are used to:

- detect attachment between two ports;
- establish the initial power roles;
- determine connector orientation;
- advertise the available current according to Type-C;
- configure VCONN;
- carry USB Power Delivery communication, when present.

This makes attach detection and power management richer than with older connectors. CC, however, does not replace the USB 2.0 protocol on D+ and D−.

### Power role and data role

USB Type-C makes two distinct axes explicit.

For power:

- **Source**: supplies power on VBUS;
- **Sink**: receives power from VBUS;
- **DRP**: can assume either role.

For data:

- **DFP**: role normally associated with the host;
- **UFP**: role normally associated with the device;
- **DRD**: can operate in either role.

In the most common connection, Source and DFP are associated, just as Sink and UFP are. The concepts nevertheless remain distinct.

A USB-C charger is a valid Source and can correctly advertise the available current. It may even negotiate a USB Power Delivery contract. That does not imply that it also implements a USB host capable of sending `GET_DESCRIPTOR`, `SET_ADDRESS`, and `SET_CONFIGURATION`: the USB-IF overview itself presents role resolution and the power contract as steps distinct from discovering and enabling data functions.[^typec-overview]

The practical consequence is simple:

> Knowing who provides power is not enough to prove that a data session exists.

## Bus-powered and self-powered devices

Detach handling changes considerably depending on how the device is powered.

### Bus-powered device

A bus-powered device depends on VBUS to operate. When the cable is removed, the microcontroller powers down or at least loses the power required to keep running.

In this case, software state cannot survive the detach for long: the system shuts down or restarts.

### Self-powered device

A self-powered device instead has an independent source, such as a battery.

When the USB cable is removed:

- the microcontroller remains powered;
- the USB task may continue running;
- stack variables remain in memory;
- the application route may continue to exist;
- the device must explicitly detect the loss of VBUS.

This makes VBUS sensing an integral part of the USB state machine. It is not useful only for knowing whether the cable is present: it is also needed to close the previous session correctly.

Different hardware integrations may detect VBUS through the PHY, a comparator, a GPIO, or an ADC. The detail depends on the platform, but the principle does not change: physical detach must reach the stack in a form that resets its state. Espressif's documentation for self-powered devices, for example, requires an external VBUS monitor outside the 5 V domain and specifies that the sensing signal should fall quickly after unplug.[^esp-self-powered] This is not a universal prescription for every MCU, but it clearly illustrates the kind of contract the hardware must provide to the software.

## How a device presents itself on the bus

The presence of VBUS does not automatically make the device visible to the host.

In USB 2.0 full-speed and low-speed, the device signals its presence through a pull-up termination:

- on `D+` for a full-speed device;
- on `D-` for a low-speed device.

When the pull-up is enabled, the host port detects the electrical state change and can begin the connection procedure.

In TinyUSB, presentation is normally controlled through:

```cpp
tud_connect();
```

The complementary function is:

```cpp
tud_disconnect();
```

The name `connect` can be misleading. The function does not certify that a host has configured the device. In the TinyUSB porting layer, `dcd_connect()` and `dcd_disconnect()` control the device's electrical connection, normally through the pull-up on the data lines; the USB state machine remains a separate layer.[^tinyusb-porting]

We can represent the sequence like this:

![Sequence from USB attach to device configuration](/blog/images/usb_vbus_enumerazione_routing/enumeration-flow-en.svg)

*VBUS allows the attempt to begin. Only host requests take the device through configuration and the mount callback.*

A charger may reach the first step. It does not necessarily reach the following ones.

## Bus reset

After detecting attach, the host performs a bus reset.

The reset:

- returns the device to the initial USB state;
- makes the default address `0` valid;
- clears the previous configuration;
- prepares a new enumeration;
- resets endpoints and class drivers in the stack.

This is not a complete reboot of the microcontroller. It is a reset of the USB state machine.

A charger does not perform this step because it does not control the bus as a host.

## Control endpoint 0

Every USB device must implement control endpoint `0`, often abbreviated as `EP0`.

The host uses it for the standard requests required during enumeration:

- reading descriptors;
- assigning an address;
- selecting a configuration;
- reading or changing device state;
- forwarding class-specific or vendor-specific requests.

A control transfer normally includes:

1. a setup stage;
2. an optional data stage;
3. a status stage.

EP0 exists before HID, CDC, or MSC endpoints. It is the channel through which host and device build the session.

## USB descriptors

Descriptors are structures through which the device describes itself to the host.

### Device descriptor

It contains global information such as:

- supported USB version;
- vendor and product identifiers;
- general class;
- maximum packet size on EP0;
- number of configurations.

### Configuration descriptor

It describes a complete device configuration and includes, directly or indirectly:

- declared current consumption;
- power attributes;
- interfaces;
- endpoints;
- class-specific descriptors.

### Interface descriptor

It groups a logical function of the device. A composite device may expose multiple interfaces, such as HID and CDC over the same connection.

### Endpoint descriptor

It defines address, direction, transfer type, maximum packet size, and polling interval.

### String descriptor

It provides human-readable strings such as manufacturer, product name, and serial number.

## Enumeration step by step

The concrete sequence may vary between operating systems and controllers, but the logical path is the following.

### 1. Attach detection

The host detects the device termination on the data lines.

### 2. Bus reset

The device returns to the initial protocol state and responds at address `0`.

### 3. Initial descriptor requests

The host reads the information needed to discover the EP0 size and identify the peripheral.

### 4. Address assignment

The host sends `SET_ADDRESS`. From that point on, the device responds at the new address.

### 5. Configuration readout

The host retrieves the configuration, interface, and endpoint descriptors.

### 6. Configuration selection

The host sends `SET_CONFIGURATION` with a non-zero value.

At this point, the device enters the **Configured** state. The non-control endpoints described by the configuration are opened, and normal class communication can begin.[^usb-concepts][^tinyusb-porting]

### 7. Class operation

The operating system binds the appropriate driver and starts using HID, CDC, MSC, or the other exposed interfaces.

For a keyboard, only now does it make sense to consider USB an available channel for reports.

## A mental map of the states

We can summarize the observable layers like this:

![Observable USB connection states and the authority of each transition](/blog/images/usb_vbus_enumerazione_routing/usb-authority-states-en.svg)

*The path separates power, presentation, control, configuration, class availability, and the application decision.*

The original mistake was jumping directly from the second state to the last one.

## `tud_connected()`, `tud_mounted()`, and `tud_ready()`

TinyUSB exposes several signals, each with a different meaning. It is best to treat them as observations of the state machine, not as synonyms for “cable connected.”

### `tud_connected()`

In the current API, it is described as true once the device has left bus reset and received the first data from the host. In the current core, the `connected` flag is set when the first setup packet is received on EP0.[^tinyusb-api][^tinyusb-core]

It is therefore good evidence that an actor capable of speaking USB exists on the other side. It does not, however, prove that the host has completed enumeration, selected a configuration, or opened the HID endpoints.

### `tud_mounted()`

It indicates that an active USB configuration exists.

In the TinyUSB device core, the function returns true when `cfg_num` is non-zero. That value is updated while handling `SET_CONFIGURATION`; with a non-zero configuration, `tud_mount_cb()` is invoked, while `SET_CONFIGURATION(0)` causes an unmount.[^tinyusb-core]

For a policy that needs to know whether the host has genuinely completed the path to the Configured state, this is a much more authoritative signal than VBUS.

### `tud_ready()`

It combines `tud_mounted()` with the absence of suspend:[^tinyusb-api]

```cpp
bool tud_ready() {
  return tud_mounted() && !tud_suspended();
}
```

It can be useful before queueing a transfer, but it should not be confused with the routing policy.

A device can be correctly configured and then suspended by the host. In that case, the session still exists, but traffic and any remote wakeup must respect the suspend rules.

### Class availability

Even `mounted` does not answer every question.

In a composite device, the configuration may be active while a specific application interface is not yet usable in the intended way. A CDC interface may require the terminal to open the port and assert DTR; a vendor class may have its own handshake; an endpoint may be busy; an HID interface may be configured but suspended.

The chain of authority therefore becomes:

1. VBUS proves that a power source is present.
2. `connected` or a setup packet proves that a host has started communicating.
3. `mounted` or `SET_CONFIGURATION != 0` proves that a USB configuration is active.
4. The class state determines whether the specific function can transfer.
5. `route-active` records that the product policy has selected USB.

### Application route

The route belongs to an even higher layer. It is a product decision, not part of the USB standard.

The firmware may choose to keep BLE active even when USB is configured, may offer a manual selection, or may prioritize USB. The stack proves that the link is available; the policy decides how to use it.

## Why BC1.2 does not solve the problem

Battery Charging 1.2 distinguishes several port types, including:[^bc12]

- **SDP**, Standard Downstream Port;
- **CDP**, Charging Downstream Port;
- **DCP**, Dedicated Charging Port.

This classification is useful for determining how much current may be drawn and for recognizing certain electrical signatures on the data lines.

It is not, however, sufficient authority for application routing.

The main reasons are:

- it primarily describes power capabilities and electrical signatures;
- it does not prove that the host completed enumeration;
- modern sources may not behave like older USB-A chargers;
- cables and adapters can make the result ambiguous;
- it ties the communication policy to a specific charger IC or hardware architecture.

In short, BC1.2 can be useful for current management and diagnostics. It should not be used as definitive proof that a data host is present. The compliance plan itself treats port detection, enumeration, and the subsequent `Set Configuration 1` as separate stages: this is a useful distinction at the firmware level as well.[^bc12-compliance]

The same applies to USB Power Delivery. A power contract proves that two port partners have negotiated power. By itself, it does not prove that a USB 2.0 class has been enumerated and configured.[^typec-overview]

## The self-powered device problem: a mounted state can become stale

In externally powered devices, unplugging the cable does not turn the firmware off. If the controller or PHY integration does not correctly report the unplug, the stack may retain part of the previous session state.

This is especially dangerous when a policy treats `tud_mounted()` as authoritative.

The problematic sequence may look like this:

![A mounted state that survives unplug and is read during a new session with a charger](/blog/images/usb_vbus_enumerazione_routing/stale-mount-session-en.svg)

*If unplug does not reach the stack, a value that was correct for the previous session can become a false positive in the next one.*

At this point, even the correct signal is interpreted incorrectly because it no longer describes the current session.

### What happens in the TinyUSB core

In the current implementation, `tud_mounted()` checks whether the active configuration number is non-zero.[^tinyusb-core]

The state is cleared through several protocol-consistent paths, including:

- bus reset;
- unplug event;
- `SET_CONFIGURATION(0)` sent by the host;
- stack deinitialization.

The important point is that `tud_disconnect()` delegates electrical removal to `dcd_disconnect()`. It does not directly call `configuration_reset()` in the core: the state is cleared when events such as bus reset or `DCD_EVENT_UNPLUGGED` arrive, when the host sends `SET_CONFIGURATION(0)`, or during deinitialization.[^tinyusb-core]

If physical detach does not produce a genuine unplug event, the previous session may therefore survive longer than expected. Public cases have been reported in which `tud_connected()` and `tud_mounted()` remained true after disconnect on an externally powered device, along with similar issues in ESP-IDF integration.[^tinyusb-2478][^esp-idf-12360]

### The design rule

For a self-powered device, we must ensure that:

1. VBUS is detected reliably;
2. the loss of VBUS is propagated immediately to the USB layer;
3. the stack receives the detach event expected by the platform;
4. the active configuration is cleared;
5. unmount callbacks and application layers are updated.

The exact method depends on the controller and its DCD. On some platforms, the PHY generates the event automatically. On others, an external monitor and a software adapter are required.

It is worth specifying that manually generating a low-level event should not be the first solution copied blindly. The platform contract, event-queue handling, and execution context required by the stack must be verified first.

## Proving that the mount belongs to the current session

Checking only the instantaneous value of `tud_mounted()` is not enough when the device may retain stale state.

A more robust policy requires **new evidence** produced during the current probe. The simplest method is to count mount events:

```cpp
static uint32_t mount_sequence;

void tud_mount_cb() {
  ++mount_sequence;
  on_usb_mounted();
}
```

At the beginning of the probe, we store the current value:

```cpp
probe.mount_sequence_at_start = mount_sequence;
```

The commit is authorized only if:

```cpp
bool probe_has_fresh_mount() {
  return tud_mounted() && mount_sequence != probe.mount_sequence_at_start;
}
```

This condition does not replace correct unplug handling. It does, however, prevent a `mounted = true` value inherited from the previous session from being interpreted as an immediate success of the new probe.

The same idea can be expressed through a `session_id`, a counter incremented when VBUS falls or a bus reset occurs, or a latch armed at the beginning of the probe and closed by `tud_mount_cb()`. What matters is the requirement:

> The commit must depend on an event observed after the current attempt began, not only on a state read from memory.

## The mechanism: probe, then commit

At this point, we can return to the original question: how do we distinguish a host from a charger without relying on VBUS or source classification?

The solution is to change the meaning of attach.

VBUS no longer directly triggers the switch to USB. Instead, it starts a **probe**.

During the probe:

1. the USB channel is initialized, if necessary;
2. the device is presented on the bus;
3. the application route remains on the previous channel;
4. the firmware waits for a real configuration;
5. if a new mount event arrives and `tud_mounted()` is true, the route is adopted;
6. if the timeout expires, the probe ends without changing the route.

The sequence becomes:

![Probe-then-commit mechanism that adopts USB only after a fresh mount](/blog/images/usb_vbus_enumerazione_routing/probe-then-commit-en.svg)

*The probe makes the device visible without immediately taking the route away from the previous channel. Commit occurs only after a new configuration.*

The central point is the separation between **presenting the device** and **routing input to USB**.

### Why the probe works

A real host can:

- detect the pull-up;
- perform a bus reset;
- send requests on EP0;
- assign an address;
- select a configuration.

A charger cannot complete this sequence.

We are therefore not trying to classify the source more accurately. We are asking the other end to prove that it is a host through the USB protocol itself.

## Separating presentation from routing

One possible implementation keeps at least the following states:

```cpp
struct UsbRouteState {
  bool vbus_present;
  bool probe_active;
  bool route_active;
};
```

Bus presentation can be reconciled with a rule like this:

```cpp
void reconcile_usb_presentation(UsbRouteState const& state) {
  bool const should_present = state.vbus_present && (state.probe_active || state.route_active);

  if (should_present) {
    tud_connect();
  } else {
    tud_disconnect();
  }
}
```

Real code should also retain the already-applied presentation state so that `tud_connect()` or `tud_disconnect()` is called only on transitions. It must also respect the controller contract: in TinyUSB, the concrete behavior is implemented by the platform DCD.[^tinyusb-porting]

The important logical relationship remains: `USB presentation = VBUS && (probe || active route)`.

When the probe succeeds, the transition from `probe_active` to `route_active` should not produce a false disconnect. The device is already configured; the policy only needs to transfer logical ownership of the connection.

## Report safety during the probe

During the probe, the device is visible on the bus, but the route still remains on BLE.

The send path must therefore be protected independently of electrical presentation:

```cpp
bool can_send_usb_report() {
  return usb_route_active() && tud_mounted() && !tud_suspended();
}
```

The exact condition depends on the architecture, but the principle is fundamental:

> Temporarily presenting USB must not allow the channel to steal or duplicate input before the commit.

In an HID device, this prevents reports from being sent simultaneously over BLE and USB or removed from the BLE queue while the probe is still in progress.

### The route transition must close the previous state

For HID, changing the transport pointer is not enough. A route may be abandoned while the previous host still believes that a key or modifier is pressed.

A robust transition should therefore:

1. stop generating new reports on the outgoing route;
2. when the link permits it, send a neutral report that releases keys, buttons, and modifiers;
3. drain or invalidate reports belonging to the old route;
4. rebuild the current state on the incoming route;
5. reopen the event flow.

This step prevents the classic “stuck key” problem and turns the commit into an application transaction rather than a simple Boolean assignment.

## The state machine

A simplified state machine can be described like this:

![Idle, Probing, and Active state machine for the USB route](/blog/images/usb_vbus_enumerazione_routing/route-state-machine-en.svg)

*The Probing state makes a cancellable attempt explicit. Active is reached only with evidence produced during the current session.*

One possible pseudocode implementation is:

```cpp
void evaluate_usb_policy() {
  switch (usb_state) {
    case UsbState::Idle:
      if (confirmed_vbus_attach()) {
        ensure_usb_initialized();
        begin_usb_probe();
        probe_deadline = now() + probe_timeout;
        usb_state = UsbState::Probing;
      }
      break;

    case UsbState::Probing:
      if (!vbus_present() || usb_disabled() || entering_standby()) {
        end_usb_probe();
        usb_state = UsbState::Idle;
        break;
      }

      if (probe_has_fresh_mount()) {
        commit_usb_route_transaction();
        usb_state = UsbState::Active;
        break;
      }

      if (now() >= probe_deadline) {
        end_usb_probe();
        usb_state = UsbState::Idle;
      }
      break;

    case UsbState::Active:
      if (!vbus_present() || !tud_mounted()) {
        fallback_to_previous_route();
        usb_state = UsbState::Idle;
      }
      break;
  }
}
```

The real state machine does not need to use exactly these states. It is important, however, that the probe is an explicit, cancellable, and observable episode, and that the commit is atomic from the application's point of view: either ownership of the flow moves entirely to USB, or it remains on the previous channel.

## Two consumers, two different time scales

VBUS may be used by at least two subsystems:

- the USB stack, which must quickly learn when the physical session has ended;
- the application policy, which wants to avoid transitions caused by glitches or brief voltage drops.

These consumers do not necessarily need the same debounce behavior.

### Fast reaction for the stack

When VBUS disappears, the USB layer should receive the information as soon as possible. Delaying unplug handling may leave endpoints, callbacks, and configuration in a state that is no longer truthful.

The signal may still pass through the hardware filtering needed to remove impossible pulses, but it should not necessarily wait for the longer debounce used by the policy.

### Debounce for the route

The route, on the other hand, may require presence or absence to remain stable for a few hundred milliseconds.

A brief VBUS sag should not:

- drop the active route;
- start a new probe;
- force a BLE reconnection;
- produce animations or mode changes visible to the user.

The general rule is therefore:

![Separation between the fast filter used by the USB stack and the debounce used by policy](/blog/images/usb_vbus_enumerazione_routing/vbus-consumers-en.svg)

*The stack must close the physical session quickly, while the route can wait for a stable signal before changing behavior.*

Using a single Boolean for both layers makes the behavior easier to write, but often less correct.

## Suspend does not mean detach

Another frequent source of confusion is suspend.

The bus may enter suspend while the device remains configured. In TinyUSB, `tud_ready()` becomes false because it combines mount with the absence of suspend, while `tud_mounted()` may remain true.[^tinyusb-api]

The policy must therefore separate two questions:

- **does the USB session still exist?** : use mount, VBUS, and unplug events;
- **can I transfer right now?** : consider suspend, endpoint busy state, and class state.

Immediately falling back to BLE on every suspend can produce unnecessary oscillation, duplication, and re-enumeration. In many products, it is more correct to keep ownership of the USB route and temporarily stop sending, optionally using remote wakeup when the host has enabled it and the class permits it.

## Choosing timeouts and intervals

There is no universal value that works for every host.

Enumeration may depend on:

- the operating system;
- hubs;
- KVM switches;
- resume state;
- machine load;
- firmware delays;
- controller initialization.

A timeout that is too short may reject valid hosts. An excessively long timeout keeps the pull-up presented unnecessarily to a charger and delays probe termination.

A cautious approach is to:

1. measure latency on several real hosts;
2. include margin for hubs and KVM switches;
3. keep the timeout configurable;
4. log the time required for enumeration;
5. distinguish laboratory timeouts from production values.

In practice, route debounce is often measured in hundreds of milliseconds, while the probe may allow a few seconds. These numbers are orders of magnitude, not constants to copy without measurement.

## First pitfall: lazy initialization of the USB channel

Many architectures initialize communication channels only when they become active.

Before introducing the probe mechanism, USB could be initialized at the same moment the route was selected. After adding the gate, starting the probe before installing the stack prevents the device from being presented, so no host can enumerate it and USB will never be adopted.

Any mechanism that presents the device before activating the route must therefore force initialization of the channel.

The correct sequence becomes:

![Correct ordering between lazy initialization, probing, and USB presentation](/blog/images/usb_vbus_enumerazione_routing/lazy-initialization-en.svg)

*Initialization prepares the stack without adopting the route. The pull-up is enabled only when the probe is ready to observe the new session.*

This regression is easy to introduce because the probe code may appear correct while the stack was never installed. In recent TinyUSB versions, device-stack initialization and electrical-connection control are separate APIs; the exact order still depends on the BSP and DCD.[^tinyusb-api]

## Second pitfall: policy branches that bypass the gate

Protecting only the branch that reacts to the attach edge is not enough.

A complex policy may adopt USB in other cases as well, for example:

- recovery from an invalid route;
- boot with VBUS already present;
- restoration after standby;
- fallback when BLE is unavailable;
- automatic selection based only on channel presence.

If even one of these branches uses `vbus_present` as sufficient proof, a charger can still capture the route.

It is therefore useful to make a concept like this explicit:

```cpp
bool usb_adoption_allowed = tud_mounted();
```

or, within the state machine:

```cpp
bool usb_adoption_allowed = probe_succeeded;
```

The gate must be applied to every automatic path that leads to USB.

A manual user choice is different. If the product allows USB to be forced, that decision may bypass the gate because it represents explicit intent. The behavior should still be documented: forcing USB toward a charger means knowingly selecting a route with no link.

## Third pitfall: stale caches and snapshots

USB events may update more quickly than application snapshots.

A higher-level interface or state machine might store:

- the current route;
- BLE availability;
- mounted state;
- the last valid link;
- configuration mode;
- the timestamp of the last transition.

If the snapshot is updated only by certain events and not by mount/unmount, the policy may react using old information.

A typical example is a recovery mode that activates when no link is available. If USB link-down is observed immediately but the BLE state in the snapshot is still stale, the system may enter recovery precisely while BLE is attempting to reconnect.

The solution is not necessarily to add an arbitrary delay. First, we need to clarify:

- which events invalidate the cache;
- which state must be read live;
- how long the expected reconnection window lasts;
- who owns the final decision.

When a transition depends on the real existence of a link, reading the authoritative signal at decision time is often safer than relying on a long-lived snapshot.

## A table of authorities

As firmware grows, it is useful to make explicit the question each signal can answer.

| Signal | Proves | Does not prove |
|---|---|---|
| Valid VBUS | A source is powering the connection | Presence of a data host |
| Attach on CC | A Type-C partner exists and initial roles have been resolved | Completed USB 2.0 enumeration |
| Pull-up presented | The device has made itself detectable on the bus | Reception of host traffic |
| Bus reset | A host controls the bus and is opening a new session | A configuration has been selected |
| First setup packet / `tud_connected()` | The host has started control communication on EP0 | Class endpoints are ready |
| `SET_CONFIGURATION != 0` / `tud_mounted()` | A configuration is active | The class is usable at every instant |
| `tud_ready()` | Configured and not suspended | A free endpoint or completed application handshake |
| `usb_route_active` | The policy has assigned the flow to USB | Future health of the connection |

This table avoids the all-powerful `usb_connected` Boolean, which tends to accumulate incompatible meanings until it becomes impossible to use correctly.

## Expected end-to-end behavior

### Connecting to a charger while using BLE

1. VBUS is detected.
2. After policy debounce, the probe begins.
3. The device presents itself on the data lines.
4. No host performs a bus reset or completes enumeration.
5. The timeout expires.
6. The pull-up is removed.
7. The route remains on BLE.

The user continues using the device without interruption.

### Connecting to a host while using BLE

1. VBUS is detected.
2. The probe presents USB.
3. The host detects the device.
4. Bus reset and enumeration occur.
5. `tud_mount_cb()` arrives and `tud_mounted()` becomes true.
6. The policy recognizes a fresh mount for the current probe and adopts USB.
7. BLE may be kept active, suspended, or disconnected according to the product rules.

The commit should not produce a new electrical disconnect: the device is already enumerated.

### Disconnecting from a host

1. VBUS disappears.
2. The stack immediately receives the unplug event.
3. The configuration is cleared.
4. USB transfers are blocked.
5. The policy confirms the detach.
6. The route returns to the fallback channel.
7. An optional reconnect window prevents premature recovery modes.

### Booting with a host already connected

The firmware must initialize the VBUS state correctly without waiting for a hardware edge that may never arrive.

Once presence is confirmed:

1. the USB channel is initialized;
2. the probe starts;
3. the host enumerates the device;
4. USB is adopted.

### Booting with a charger already connected

The initial presence starts the probe, but no configuration is completed. The automatic route remains on the available channel, without treating power alone as a data link.

### Rapid unplug and replug

A very brief unplug may be absorbed by the policy debounce while the stack still receives the physical events needed to rebuild the session.

This scenario must be tested carefully. The behavior depends on the host, controller, and actual detach duration.

## Useful telemetry during debugging

When USB “does not work,” a single Boolean variable is rarely enough.

It is useful to observe at least:

- raw VBUS;
- debounced VBUS;
- pull-up state;
- probe start and end;
- bus-reset reception;
- first setup-packet reception;
- assigned address;
- active configuration;
- session counter or generation ID;
- mount-event counter;
- `tud_connected()`;
- `tud_mounted()`;
- suspend state;
- application route;
- reason for the last transition;
- result of the last HID transfer;
- event timestamps.

A timeline makes many problems immediately visible:

![Comparison between the sequence observed with a USB host and the sequence observed with a charger](/blog/images/usb_vbus_enumerazione_routing/host-vs-charger-timeline-en.svg)

*A host produces reset, control traffic, and configuration. With a charger, the probe reaches its timeout and the previous route remains active.*

The values are only illustrative. What matters is the sequence of events.

## Minimum test matrix

| Scenario | Expected result |
|---|---|
| Boot without a cable | No USB session; fallback route available. |
| Boot with a host | Enumeration followed by USB adoption. |
| Boot with a charger | No automatic USB adoption. |
| BLE active, then host connected | Switch to USB only after configuration. |
| BLE active, then charger connected | BLE continues carrying input. |
| Host disconnected | Consistent unmount and controlled fallback. |
| Host, unplug, then charger | No inherited mounted state and no commit without a new mount. |
| Charge-only cable | VBUS present, no enumeration. |
| Powered hub | Enumeration within the expected timeout. |
| Unpowered hub | Consistent behavior even during VBUS sags. |
| Slow KVM | No false rejection with the production timeout. |
| USB disabled during the probe | Probe cancelled and presentation removed. |
| Entering standby during the probe | Probe closed according to the power policy. |
| Manual USB selection | Behavior consistent with explicit user intent. |
| Suspend and resume | Route remains consistent; sending stops and resumes without a false detach. |
| Route change while a key is pressed | No key or modifier remains stuck on the outgoing transport. |
| Rapid unplug/replug | A valid new session or controlled fallback. |

It is useful to repeat the tests on:

- GNU/Linux;
- macOS;
- Windows;
- different hubs;
- KVM switches, if supported;
- USB-A chargers;
- USB-C chargers;
- power banks;
- data cables;
- charge-only cables.

## Common conceptual mistakes

### “High VBUS means a host is connected”

No. It only means that a power source is present.

### “USB Type-C automatically means data”

No. Type-C describes the connector and part of the attach and power system. Data capabilities depend on the ports, controller, and cable.

### “If the charger IC detects a data port, a host definitely exists”

Not necessarily. Electrical classification is not equivalent to completed enumeration.

### “`tud_connect()` means USB is ready”

No. It means that the device is being presented on the bus.

### “`tud_connected()` and `tud_mounted()` are equivalent”

No. In the current core, the first is marked when the first setup packet is received; the second reflects an active configuration.[^tinyusb-core]

### “`tud_disconnect()` always clears the entire session”

This is not a universal guarantee. The behavior depends on the DCD and on reset or unplug events reaching the stack.

### “If `tud_mounted()` is true, the mount certainly belongs to the current cable”

Not on a self-powered device where detach is not propagated correctly. The policy should require a new mount event or a session generation consistent with the current probe.

### “One debounce is suitable for everything”

Not always. The stack and the policy have different timing goals.

## Limitations and trade-offs

The probe-then-commit mechanism solves the main problem, but it does not eliminate every design decision.

### The timeout remains a choice

An extremely slow host may fail to complete enumeration within the expected window. The value must therefore be measured and verified against real use cases.

### Enumeration proves a USB host, not complete application health

A device may be configured and later encounter transfer errors, abnormal suspend behavior, or class-specific problems. It may also remain enumerated while the host application no longer consumes reports as expected. Initial link availability does not replace operational monitoring.

### Manual behavior must be defined

If the user forces USB, the product must decide whether to keep that choice even without a host, display an error, or automatically return to the fallback route.

### The low-level implementation remains platform-dependent

VBUS sensing, unplug generation, and pull-up handling depend on the controller, PHY, and TinyUSB port. The policy pattern is portable; the physical integration is not completely portable.

### Very rapid swaps remain an edge case

A host-to-charger swap faster than the debounce interval may produce a short window in which the route does not yet represent the new physical reality. The system must still recover through loss of mount, transfer errors, or a subsequent presence check.

## How to choose the correct signal

Before using a variable in a policy, it is useful to formulate the question explicitly.

### “Is a power source present?”

Use VBUS or the equivalent signal provided by the power-management hardware.

### “How much current may I draw?”

Use Type-C current advertisement, BC1.2, USB Power Delivery, or the mechanism provided by the platform.

### “Has a host started communicating?”

Observe bus reset, setup packets, or `tud_connected()`.

### “Has the device been configured?”

Observe `SET_CONFIGURATION`, mount callbacks, or `tud_mounted()`. On self-powered devices, also verify that the evidence belongs to the current session.

### “Can I send data right now?”

Consider configuration, suspend, endpoint busy state, and class state.

### “Should I move the application route?”

Combine the authoritative link signal with product rules, user choice, and any fallback behavior.

There is therefore no single Boolean named “USB connected” that can correctly answer all these questions.

## Conclusion

We have seen how a USB connection is composed of distinct steps.

VBUS proves the presence of power. The USB Type-C CC pins manage attach, orientation, and initial roles. The pull-up presents the device on the USB 2.0 bus. Bus reset opens a new session. EP0 allows the host to read descriptors, assign an address, and select a configuration. Only after `SET_CONFIGURATION` can a class such as HID be considered genuinely available.

The issue is even more delicate in self-powered devices because unplugging the cable does not turn off the microcontroller. VBUS must therefore be monitored, and unplug must reach the stack correctly; otherwise, state from the previous session may survive.

The solution to the host-versus-charger problem is not to classify the power source more accurately. It is to let the protocol provide the proof.

We temporarily present USB, wait for a host to complete enumeration, and adopt the route only after a new mount belonging to the current probe. The route transition is then completed as a transaction: close the previous HID state, transfer ownership, and open the new channel. A real host passes the probe. A charger does not.

In short, power, attach, enumeration, and application routing are not synonyms. Treating them as separate states makes the firmware more precise, easier to diagnose, and less prone to regressions that are difficult to reproduce.

## References

### Specifications and documentation

- [USB 2.0 Specification] : base specification and collection of USB 2.0 ECNs.
- [USB Type-C System Overview] : USB-IF overview of CC, roles, VBUS, VCONN, and USB Power Delivery.
- [Battery Charging v1.2 Spec] : BC1.2 specification and errata.
- [USB Battery Charging 1.2 Compliance Plan] : procedures that distinguish port detection, enumeration, and configuration.
- [HID 1.11] : HID class definition and interrupt-endpoint behavior.
- [TinyUSB USB Concepts] : host/device model, transfers, states, and enumeration.
- [TinyUSB Device API] : public semantics of `tud_connected()`, `tud_mounted()`, `tud_ready()`, and callbacks.
- [TinyUSB Porting] : Device Controller Driver contract, bus events, and endpoint handling.
- [Self-Powered USB Device Solutions] : example of VBUS monitoring for a self-powered device.

### Upstream sources and cases

- [TinyUSB usbd.c] : implementation of `connected`, `cfg_num`, bus reset, unplug, and `SET_CONFIGURATION`.
- [TinyUSB issue #2478] : public case of connected/mounted state persisting after detach on an externally powered device.
- [ESP-IDF issue #12360] : public case of unplug not being detected in a self-powered scenario.
- [ZMK issue #841] : USB-selection problem when only power is present.

### Image credits

- Cover image: [USB Type-C plug 20170626.jpg] by [Santeri Viinamäki], Wikimedia Commons, licensed under [CC BY-SA 4.0]. Image cropped and converted to WebP for the site layout.

## Notes

The notes referenced in the text provide the details of the technical sources used.

[^usb-concepts]: TinyUSB, [USB Concepts], especially host/device roles, states, transfers, and enumeration.
[^hid11]: USB-IF, [Device Class Definition for HID 1.11]. Interrupt endpoints are polled by the host according to the declared polling interval.
[^typec-overview]: USB-IF, [USB Type-C System Overview], slides on the discovery process: CC resolves Source/Sink and DFP/UFP, while USB PD establishes the power contract and data functions follow separate steps.
[^esp-self-powered]: Espressif, [USB Device Driver : Self-Powered Device]. The page describes the VBUS monitoring required for an independently powered device to recognize connection and disconnection.
[^tinyusb-porting]: TinyUSB, [Porting]. The documentation describes `dcd_connect()`/`dcd_disconnect()`, bus events, and endpoint opening after configuration selection.
[^tinyusb-api]: TinyUSB, [`src/device/usbd.h`]. The API comments distinguish connected, mounted, suspended, and ready.
[^tinyusb-core]: TinyUSB, [`src/device/usbd.c`]. In the current core, `tud_mounted()` depends on `cfg_num`; the first setup packet sets `connected`; bus reset and unplug invoke configuration reset; `SET_CONFIGURATION` updates `cfg_num` and invokes mount/unmount.
[^bc12]: USB-IF, [Battery Charging v1.2 Spec and Adopters Agreement].
[^bc12-compliance]: USB-IF, [USB Battery Charging 1.2 Compliance Plan]. The test procedures treat electrical detection and subsequent enumeration/configuration as separate stages.
[^tinyusb-2478]: TinyUSB, [issue #2478: `tud_connected()` and `tud_mounted()` stay true after disconnected].
[^esp-idf-12360]: Espressif, [issue #12360: TinyUSB problems with USB unplugging detection].

[USB 2.0 Specification]: https://www.usb.org/document-library/usb-20-specification
[USB Type-C System Overview]: https://www.usb.org/sites/default/files/D1T1-2%20-%20USB%20Type-C%20System%20Overview.pdf
[Battery Charging v1.2 Spec]: https://www.usb.org/document-library/battery-charging-v12-spec-and-adopters-agreement
[USB Battery Charging 1.2 Compliance Plan]: https://www.usb.org/document-library/usb-battery-charging-12-compliance-plan
[HID 1.11]: https://www.usb.org/sites/default/files/documents/hid1_11.pdf
[Device Class Definition for HID 1.11]: https://www.usb.org/sites/default/files/documents/hid1_11.pdf
[TinyUSB USB Concepts]: https://docs.tinyusb.org/en/latest/reference/usb_concepts.html
[USB Concepts]: https://docs.tinyusb.org/en/latest/reference/usb_concepts.html
[TinyUSB Device API]: https://github.com/hathach/tinyusb/blob/master/src/device/usbd.h
[`src/device/usbd.h`]: https://github.com/hathach/tinyusb/blob/master/src/device/usbd.h
[TinyUSB Porting]: https://docs.tinyusb.org/en/latest/porting.html
[Porting]: https://docs.tinyusb.org/en/latest/porting.html
[Self-Powered USB Device Solutions]: https://docs.espressif.com/projects/esp-idf/en/v5.1.1/esp32s2/api-reference/peripherals/usb_device.html#self-powered-device
[USB Device Driver : Self-Powered Device]: https://docs.espressif.com/projects/esp-idf/en/v5.1.1/esp32s2/api-reference/peripherals/usb_device.html#self-powered-device
[TinyUSB usbd.c]: https://github.com/hathach/tinyusb/blob/master/src/device/usbd.c
[`src/device/usbd.c`]: https://github.com/hathach/tinyusb/blob/master/src/device/usbd.c
[TinyUSB issue #2478]: https://github.com/hathach/tinyusb/issues/2478
[issue #2478: `tud_connected()` and `tud_mounted()` stay true after disconnected]: https://github.com/hathach/tinyusb/issues/2478
[ESP-IDF issue #12360]: https://github.com/espressif/esp-idf/issues/12360
[issue #12360: TinyUSB problems with USB unplugging detection]: https://github.com/espressif/esp-idf/issues/12360
[ZMK issue #841]: https://github.com/zmkfirmware/zmk/issues/841
[Battery Charging v1.2 Spec and Adopters Agreement]: https://www.usb.org/document-library/battery-charging-v12-spec-and-adopters-agreement
[USB Type-C plug 20170626.jpg]: https://commons.wikimedia.org/wiki/File:USB_Type-C_plug_20170626.jpg
[Santeri Viinamäki]: https://commons.wikimedia.org/wiki/User:Zunter
[CC BY-SA 4.0]: https://creativecommons.org/licenses/by-sa/4.0/
