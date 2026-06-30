---
title: "non_null in C++"
lang: en
translated_from: it
auto_translated: false
date: 2026-06-23
desc: "How to distinguish a mandatory pointer from an optional value directly in a function signature."
read: "4 min"
tags: ["C++", "Types"]
categories: ["Programming", "Analysis"]
image: "/blog/covers/non_null_cpp.webp"
---
## Introduction
A raw pointer in C++ communicates less than it seems.
It says that a function receives an address, but it says almost nothing about the contract that address is expected to satisfy.

Can the value be `nullptr`?
Is the absence of the object an expected case?
Does the function own the resource, or does it only observe it?
How long does the pointed-to object have to remain valid?

A signature like this leaves too many interpretations open.

```cpp
auto render(widget* const target) -> void;
```

`target` might be mandatory.
It might be optional.
`nullptr` might be an explicit way to say "render nothing".
Or `target` might be a parameter that the implementation always assumes to be valid, without the type making that visible to the reader.

That is the problem: the signature does not distinguish between an allowed case and a caller error.
To understand the real contract, the reader has to open the implementation, look for a comment, or reconstruct the surrounding context from other parts of the code.

## Optional pointer or mandatory pointer
A pointer that can be null is not wrong by itself.
It is the right choice when the absence of the object is part of the API behavior.

```cpp
auto render(widget* const target) -> void {
  if (target == nullptr) {
    return;
  }

  target->paint();
}
```

In this example, `nullptr` is not an error.
It is a valid input, handled immediately, with clear behavior: if there is no target, nothing is rendered.

The interesting case is the other one.
If a function cannot do anything without that object, continuing to use `widget*` makes the contract weaker than it needs to be.
The signature suggests that `nullptr` might arrive, while for that function it would only be a violated precondition.

## The idea of non_null
`non_null<T>` moves that precondition into the type.
It does not own the object, extend its lifetime, or decide who destroys it.
It does something smaller, but useful: it communicates that the value must be present.

A reduced version, useful for understanding the mechanism, can look like this.

```cpp
#include <cassert>
#include <concepts>
#include <cstddef>
#include <memory>
#include <utility>

namespace detail {

template <typename Pointer>
concept pointer_like = requires(Pointer const ptr) {
  *ptr;
  { ptr != nullptr } -> std::convertible_to<bool>;
};

}  // namespace detail

template <detail::pointer_like Pointer>
class non_null {
public:
  using pointer_type = Pointer;
  using element_type = typename std::pointer_traits<pointer_type>::element_type;

private:
  pointer_type m_ptr;

public:
  constexpr non_null(pointer_type ptr) noexcept : m_ptr{std::move(ptr)} {
    if !consteval {
      assert(m_ptr != nullptr && "non_null: constructed with nullptr");
    }
  }

  non_null(std::nullptr_t) = delete;
  auto operator=(std::nullptr_t) -> non_null& = delete;

  [[nodiscard]] constexpr auto get() const noexcept -> pointer_type const& {
    return m_ptr;
  }

  constexpr auto operator->() const noexcept -> pointer_type const& {
    return m_ptr;
  }

  constexpr auto operator*() const noexcept -> element_type& {
    return *m_ptr;
  }
};
```

This version is not meant to be a complete library.
It is only enough to make the idea visible:

- constructing a `non_null` directly from `nullptr` is not allowed;
- a null value passed through a variable is caught in debug;
- inside the called function, the same check does not have to be repeated at every access.

In a real project, the team may choose a more robust implementation, an explicit error strategy, or a library that is already part of the codebase.
The point stays the same: if a pointer cannot be null, that rule belongs in the signature, not in the caller's memory.

## An example
A simple example is a function that has to write to a logger.
Without a logger, it cannot do its job, so modeling that parameter as optional would be misleading.

```cpp
struct logger {
  auto write(std::string const& message) const -> void;
};

auto run_job(non_null<logger const*> const log, int const items) -> void {
  log->write("starting job");

  for (auto i{0}; i < items; ++i) {
    log->write("processed item");
  }

  log->write("job complete");
}
```

The signature is now more precise.
`run_job` requires a valid logger and does not present absence as a normal execution case.

If the caller has a pointer that might be null, that doubt has to be resolved before the call.

```cpp
logger const* const maybe_log{find_logger()};

if (maybe_log == nullptr) {
  return;
}

run_job(non_null{maybe_log}, 10);
```

The check stays where absence can actually occur.
Past that boundary, the rest of the code works with a tighter and more readable contract: every function is no longer asked to defend itself from a case that does not belong to it.

## What it does not solve
`non_null` does not make a destroyed object valid.
A pointer can be different from `nullptr` and still point to memory that is no longer valid.
The wrapper does not protect against dangling pointers, race conditions, or incorrect lifetime management.

That distinction matters.
`non_null` expresses a guarantee about nullness, not ownership and not lifetime.

For that reason, it works well as a boundary type: function parameters, non-owning members, views toward objects that must exist.
When ownership, transfer, or sharing have to be represented, the right type is something else: `std::unique_ptr`, `std::shared_ptr`, a reference, or a dedicated owner.

## When to use it
`non_null` is useful when `nullptr` would be a bug, not a behavior variant.

Typical examples:

- a mandatory dependency passed to a function;
- an object already validated before calling an algorithm;
- a non-owning view stored by a component;
- a pointer produced by an initialization phase that must succeed.

There is no need to wrap every pointer in the codebase.
Use it where the contract matters more than the convenience of a generic signature, especially when the point where absence is handled should be clearly separated from the point where the value is used.

## Conclusion
`non_null` does not solve every pointer problem.
It solves a more precise one: preventing a mandatory parameter from looking optional.

If `nullptr` is a meaningful value, the code should treat it as a normal case.
If absence is not allowed, it is better to say that in the type.
The interface becomes more honest, because it moves a hidden assumption into the signature and leaves the function body with a simpler contract to read.
