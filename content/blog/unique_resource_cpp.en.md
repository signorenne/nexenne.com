---
title: "unique_resource in C++"
lang: en
date: 2026-06-15
desc: "Apply RAII to handles that are not pointers."
read: "5 min"
tags: ["C++", "RAII"]
categories: ["Programming", "Tutorial"]
image: "/blog/covers/unique_resource_cpp.webp"
translated_from: it
auto_translated: false
---
## Introduction
`std::unique_ptr` is one of the clearest ways to express ownership in C++.
It owns a pointer, releases it in the destructor, and prevents accidental copies.

Not every resource is a pointer, though.
Many APIs return file descriptors, sockets, opaque handles, numeric identifiers, or values that must be released with a specific function.
In those cases, the same RAII guarantee is useful, but applied to a more general type.

`unique_resource` is a small owner for that scenario.
It keeps a handle and a cleanup function together.
When the object leaves scope, if it still owns the resource, it runs the deleter exactly once.

## The problem
The starting point is a function that opens a sensor, configures it, and reads a header.
If any step fails, the handle must be closed before returning.

```cpp
auto use_sensor(char const* const path) -> bool {
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

The code is correct, but the guarantee is scattered.
Every exit path after opening the handle must contain a call to `close_sensor`.

The problem is not the call itself.
The problem is that the resource has a precise rule: if acquisition succeeds, release must happen.
That rule should be modeled by an object, not left to the discipline of whoever edits the function.

## The idea of unique_resource
A `unique_resource` keeps three pieces of information together:

- the resource value, for example a file descriptor;
- the deleter, meaning the function used to release it;
- an ownership flag, because some values can represent an invalid resource.

A simplified version is the following.

```cpp
#include <type_traits>
#include <utility>

template <typename Resource, typename Deleter>
class unique_resource final {
public:
  using resource_type = Resource;
  using deleter_type = Deleter;

  static_assert(std::is_nothrow_invocable_v<deleter_type&, resource_type&>);

private:
  resource_type m_resource;
  [[no_unique_address]] deleter_type m_deleter;
  bool m_owns{false};

public:
  unique_resource(
    resource_type resource,
    deleter_type deleter,
    bool const owns = true
  ) noexcept(std::is_nothrow_move_constructible_v<resource_type> &&
             std::is_nothrow_move_constructible_v<deleter_type>)
      : m_resource{std::move(resource)}
      , m_deleter{std::move(deleter)}
      , m_owns{owns} {}

  unique_resource(unique_resource const&) = delete;
  auto operator=(unique_resource const&) -> unique_resource& = delete;

  unique_resource(unique_resource&& other
  ) noexcept(std::is_nothrow_move_constructible_v<resource_type> &&
             std::is_nothrow_move_constructible_v<deleter_type>)
      : m_resource{std::move(other.m_resource)}
      , m_deleter{std::move(other.m_deleter)}
      , m_owns{std::exchange(other.m_owns, false)} {}

  ~unique_resource() noexcept { reset(); }

  auto reset() noexcept -> void {
    if (m_owns) {
      m_deleter(m_resource);
      m_owns = false;
    }
  }

  [[nodiscard]] auto release() noexcept -> resource_type {
    m_owns = false;
    return std::move(m_resource);
  }

  [[nodiscard]] auto get() const noexcept -> resource_type const& {
    return m_resource;
  }

  [[nodiscard]] auto owns() const noexcept -> bool { return m_owns; }
};
```

Copying is disabled because two owners must not release the same handle.
Moving, on the other hand, transfers ownership and disables the source object.

The destructor calls `reset()`.
If the object still owns the resource, the deleter is executed.
If the resource was released or moved elsewhere, the destructor does nothing.

The important part is that the release rule is no longer distributed across exit paths.
It is a property of the object that owns the resource.

## Handling the invalid value
Many APIs use a sentinel value to report failure.
A file descriptor may use `-1`, a handle may use `nullptr`, an id may use `0`.

It is useful to fix that rule when building the owner.

```cpp
template <typename Resource, typename Invalid, typename Deleter>
[[nodiscard]] auto make_unique_resource_checked(
  Resource resource,
  Invalid const invalid,
  Deleter deleter
) -> unique_resource<Resource, Deleter> {
  auto const owns{resource != invalid};

  return unique_resource<Resource, Deleter>{
    std::move(resource),
    std::move(deleter),
    owns
  };
}
```

If the value is valid, the object owns the resource.
If it matches the sentinel value, the object does not own the resource and the destructor does not call the deleter.

That distinction matters.
An invalid handle is not a resource to close, but the signal that acquisition did not happen.
Closing an invalid value would be useless at best; at worst, it could hide a bug or call the API with a value that represents no resource at all.

## Rewriting the function
With a local owner, the function goes back to expressing its own logic.
Closing the handle no longer has to be repeated in every exit path.

```cpp
auto use_sensor(char const* const path) -> bool {
  auto const close{[](int& fd) noexcept {
    close_sensor(fd);
  }};

  auto sensor{make_unique_resource_checked(open_sensor(path), -1, close)};

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

Now every exit from the function goes through the same place: the destructor of `sensor`.
Cleanup stays associated with acquisition and no longer depends on how many exit paths the function has.

The meaning of the function also becomes clearer.
The function no longer repeats the sensor close operation in every branch; it declares it once, immediately after opening the sensor.

## When to use release
`release()` is for transferring ownership to something else.
It does not release the resource.
It disables the current owner and returns the handle.

```cpp
auto const fd{sensor.release()};
register_sensor(fd);
```

It should be used only when the code receiving the handle truly becomes responsible for closing it.
Otherwise, `release()` turns automatic cleanup back into manual responsibility, and the benefit of RAII disappears.

This is an easy point to underestimate.
`release()` does not mean "release the resource"; it means "stop owning it here".
From that moment on, some other point in the code has to be responsible for closing it.

## When to use it
`unique_resource` is useful for file descriptors, sockets, C library handles, mappings, locks returned by external APIs, and, more generally, resources that are not modeled well by `std::unique_ptr`.

If the resource is a normal pointer, `std::unique_ptr` remains the better choice.
If all that is needed is to run an action at the end of a scope, without owning a handle, a scope guard is more direct.

The difference is this: `scope_guard` protects an action, `unique_resource` owns a resource.
When that distinction is visible in the type, the code using the API becomes harder to misuse.

## Conclusion
`unique_resource` brings RAII outside the classic pointer case.
It makes ownership visible, connects acquisition and cleanup, and reduces the points where someone has to remember to call cleanup.

When a resource has a precise release rule, encapsulating it in a dedicated owner makes the code easier to read and more robust.
Not because cleanup disappears, but because it finally has a clear place to live.
