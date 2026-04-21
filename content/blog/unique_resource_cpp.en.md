---
title: "unique_resource in C++: RAII for Handles and Non-Pointer Resources"
lang: en
translated_from: it
auto_translated: false
date: 2026-04-21
lastmod: 2026-07-04
desc: "Applying RAII to file descriptors, sockets, and handles with exclusive ownership."
read: "6 min"
tags: ["C++", "RAII"]
categories: ["Programming", "Tutorial"]
image: "/blog/covers/unique_resource_cpp.webp"
---

## Abstract

`std::unique_ptr` makes one rule particularly clear: an object owns a resource and releases it exactly once when its lifetime ends. Many APIs, however, do not return pointers. File descriptors, sockets, opaque handles, and numeric identifiers use different representations and cleanup functions.

In those cases, I want to preserve the ownership rule rather than the pointer-specific type. Acquisition and release must stay together, copying must be forbidden, and moving must transfer ownership without duplicating it.

A `unique_resource` models that scenario. This article develops a deliberately limited educational implementation and identifies the places where a general-purpose facility needs stronger guarantees.

## The problem

Suppose an API opens a sensor and returns an integer handle. A value of `-1` reports failure, while `close_sensor()` releases a valid handle.

```cpp
auto use_sensor(char const* path) -> bool {
  int const fd{open_sensor(path)};

  if (fd == -1) {
    return false;
  }

  if (!configure(fd)) {
    close_sensor(fd);
    return false;
  }

  if (!read_header(fd)) {
    close_sensor(fd);
    return false;
  }

  close_sensor(fd);
  return true;
}
```

The function is easy to follow, but its release guarantee is scattered across several exit paths. Every new check has to remember `close_sensor()`, and an exception introduced after acquisition creates another path to cover.

The resource has one underlying rule: after successful acquisition, exactly one owner is responsible for closing it. That rule belongs in an object.

## What the owner must guarantee

A generic handle owner needs to store:

- the value that identifies the resource;
- the deleter that knows how to clean it up;
- an ownership state, because a sentinel value may mean that acquisition never succeeded.

Copying must be disabled: two copies would both believe they own the same handle. Moving is useful, but it must disarm the source object. The deleter has a contract as well: cleanup invoked by the destructor cannot allow an exception to escape.

## A minimal implementation

The following version uses C++20 and accepts only resources and deleters that can be moved without throwing. This is restrictive, but it prevents construction or transfer from failing after acquisition and leaving the resource unprotected.

```cpp
#include <concepts>
#include <functional>
#include <type_traits>
#include <utility>

template <typename Resource, typename Deleter>
class [[nodiscard]] unique_resource final {
public:
  using resource_type = Resource;
  using deleter_type = Deleter;

  static_assert(std::is_nothrow_move_constructible_v<resource_type>);
  static_assert(std::is_nothrow_move_constructible_v<deleter_type>);
  static_assert(
      std::is_nothrow_invocable_v<deleter_type&, resource_type&>);

  unique_resource(resource_type resource,
                  deleter_type deleter,
                  bool owns = true) noexcept
      : m_resource{std::move(resource)},
        m_deleter{std::move(deleter)},
        m_owns{owns} {}

  unique_resource(unique_resource const&) = delete;
  auto operator=(unique_resource const&) -> unique_resource& = delete;

  unique_resource(unique_resource&& other) noexcept
      : m_resource{std::move(other.m_resource)},
        m_deleter{std::move(other.m_deleter)},
        m_owns{std::exchange(other.m_owns, false)} {}

  auto operator=(unique_resource&&) -> unique_resource& = delete;

  ~unique_resource() noexcept {
    reset();
  }

  auto reset() noexcept -> void {
    if (std::exchange(m_owns, false)) {
      std::invoke(m_deleter, m_resource);
    }
  }

  [[nodiscard]] auto release() noexcept -> resource_type {
    m_owns = false;
    return std::move(m_resource);
  }

  [[nodiscard]] auto get() noexcept -> resource_type& {
    return m_resource;
  }

  [[nodiscard]] auto get() const noexcept -> resource_type const& {
    return m_resource;
  }

  [[nodiscard]] auto owns() const noexcept -> bool {
    return m_owns;
  }

private:
  resource_type m_resource;
  [[no_unique_address]] deleter_type m_deleter;
  bool m_owns{false};
};
```

`reset()` clears the ownership state before invoking the deleter, so the destructor cannot release the resource twice. `[[no_unique_address]]` allows the compiler to avoid separate storage for an empty deleter when the layout rules permit it; it is not a universal promise about the final size of the wrapper.

Move assignment is deleted to keep the example focused. A complete implementation may support it, but it must first release any resource already owned by the destination.

## Handling an invalid value

Many APIs use a sentinel: `-1` for some file descriptors, `nullptr` for certain handles, or a library-defined value. A factory can centralize that check.

```cpp
template <typename Resource, typename Invalid, typename Deleter>
  requires
    std::is_nothrow_constructible_v<
        std::remove_cvref_t<Resource>, Resource&&> &&
    std::is_nothrow_constructible_v<
        std::remove_cvref_t<Deleter>, Deleter&&> &&
    requires(std::remove_reference_t<Resource> const& resource,
             Invalid const& invalid) {
      { resource != invalid } noexcept -> std::convertible_to<bool>;
    }
[[nodiscard]] auto make_unique_resource_checked(
    Resource&& resource,
    Invalid const& invalid,
    Deleter&& deleter) noexcept
    -> unique_resource<std::remove_cvref_t<Resource>,
                       std::remove_cvref_t<Deleter>> {
  using resource_type = std::remove_cvref_t<Resource>;
  using deleter_type = std::remove_cvref_t<Deleter>;

  auto const owns{resource != invalid};

  return unique_resource<resource_type, deleter_type>{
      resource_type{std::forward<Resource>(resource)},
      deleter_type{std::forward<Deleter>(deleter)},
      owns};
}
```

The comparison is required to be `noexcept` and runs before the resource is transferred. The factory also verifies that the resource and deleter can be constructed without throwing from the exact value categories supplied. It therefore neither inspects a moved-from object nor fails while leaving an acquired resource without an owner.

Expression ordering at the call site still matters. It is prudent to construct the deleter first and acquire the resource afterward rather than hide potentially throwing setup operations in the same argument list.

## Rewriting the function

We therefore define the deleter before calling `open_sensor()`.

```cpp
auto use_sensor(char const* path) -> bool {
  auto const close{[](int& fd) noexcept {
    close_sensor(fd);
  }};

  auto sensor{
      make_unique_resource_checked(open_sensor(path), -1, close)};

  if (!sensor.owns()) {
    return false;
  }

  if (!configure(sensor.get())) {
    return false;
  }

  if (!read_header(sensor.get())) {
    return false;
  }

  return true;
}
```

Every exit after `sensor` is constructed now passes through the same destructor. The function can express its actual work, while closing the handle becomes a property of the owner.

## `release()` does not close the resource

The name can be misleading. `release()` does not invoke the deleter. It removes responsibility from the current owner and returns the handle.

```cpp
auto fd{sensor.release()};
register_sensor(fd); // another owner must close fd from this point
```

This operation is appropriate only when ownership genuinely moves elsewhere. If the receiver does not clearly accept the cleanup responsibility, `release()` reintroduces the manual management that RAII removed.

## When it fits

`unique_resource` works well for file descriptors, sockets, C-library handles, mappings, and other resources represented by non-pointer values. `std::unique_ptr` can also be adapted to some handles through a deleter-defined `pointer` type, but integer sentinels can make that model less direct.

For an ordinary pointer and deleter, `std::unique_ptr` remains the natural choice. When there is no handle to own and the requirement is simply to run an action at scope exit, a scope guard communicates the intent better.

This example should not be presented as a C++23 standard facility. WG21 proposal P0052 specifies `unique_resource` together with the scope guards, and the Library Fundamentals TS v3 working draft places it in `std::experimental`. Availability depends on the toolchain; for production use, I would prefer a maintained and tested implementation when the project provides one.

## Conclusion

`unique_resource` extends RAII beyond pointers. It makes ownership visible, prevents accidental copies, and binds cleanup to an object's lifetime.

Calling a deleter from a destructor is the easy part. Preserving the guarantee through construction, moves, sentinel handling, and handle transfer is where the design becomes subtle. A teaching implementation can remain small; a production-quality generic owner deserves stricter constraints, tests, and much more careful exception handling.

## References

- [P0052R10 — Generic Scope Guard and RAII Wrapper for the Standard Library](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2019/p0052r10.pdf)
- [N4939 — C++ Extensions for Library Fundamentals, Version 3](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2023/n4939.html)
