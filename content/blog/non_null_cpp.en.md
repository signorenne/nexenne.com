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
A raw pointer in C++ is a semantically poor type.
It says that we can refer to an object, but it says very little about the contract.

Can it be null?
Who owns the object?
Should the function handle absence?
Is the pointer only a temporary view?

When we read a signature like this, all these questions remain open.

```cpp
auto render(widget* const target) -> void;
```

Maybe `target` is mandatory.
Maybe `nullptr` means "render nothing".
Maybe the function checks internally, or maybe it simply assumes that the caller did not make a mistake.

The compiler cannot help much, because the chosen type does not distinguish those cases.

## Optional pointer or mandatory pointer
Not every pointer that can be null is a design mistake.
Sometimes absence is part of the domain: there is no object to work on, so `nullptr` is a valid value.
In those situations an optional pointer is legitimate, as long as the function signature and body make that contract explicit.

```cpp
auto render(widget* const target) -> void {
  if (target == nullptr) {
    return;
  }

  target->paint();
}
```

Here `nullptr` is part of the function's behavior.
The check is necessary and documents a choice.

The different case is a pointer that should never be null.
In that case, writing `widget*` still suggests a possibility that is not actually part of the API contract.

## The idea of non_null
A `non_null<T>` type makes that distinction visible.
It does not change ownership and it does not solve the object's lifetime.
It says one precise thing: the contained value cannot be null.

A minimal version can be written like this.

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

This is not a complete library, but it is enough to show the idea:

- constructing the wrapper from `nullptr` is forbidden;
- a null value coming from a variable is caught in debug;
- inside the function, the check does not need to be repeated at every use.

## An example
Suppose a function needs a logger.
Without a logger it cannot do anything useful, so we do not want to model it as optional.

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

The signature is more explicit.
`run_job` requires a valid `logger`.
If the caller has a pointer that may be null, it must solve that problem before entering the function.

```cpp
logger const* const maybe_log{find_logger()};

if (maybe_log == nullptr) {
  return;
}

run_job(non_null{maybe_log}, 10);
```

The absence check stays where absence can actually exist.
After that boundary, the rest of the code works with a tighter contract.

## What it does not solve
`non_null` does not make a destroyed object valid.
It does not prevent dangling pointers, race conditions or poorly managed lifetime.
If the pointer refers to an object that no longer exists, the wrapper cannot save us.

This is an important limit.
The type expresses non-nullness, not ownership and not lifetime.

For that reason, it works well as a boundary type, especially in function parameters or members that are clearly non-owning views.
When ownership, transfer or sharing need to be represented, the right type is still something else: `std::unique_ptr`, `std::shared_ptr`, a reference or a domain-specific object.

## When to use it
`non_null` is useful when absence would be a bug, not a case to handle.

Typical examples:

- a mandatory dependency passed to a function;
- a target already validated before calling an algorithm;
- a non-owning view stored by a component;
- a pointer obtained from an initialization phase that must succeed.

In these cases, the type moves information from documentation into the signature.
The reader does not have to look for comments explaining whether `nullptr` is allowed: the type says it.

## Conclusion
`non_null` is not magic that makes every pointer safe.
It is a simple way to make an interface more honest.

If a parameter is truly optional, treat it as optional.
If it is mandatory, say so in the type.
The resulting code is easier to read, because it separates the place where absence is validated from the place where the validated contract is used.
