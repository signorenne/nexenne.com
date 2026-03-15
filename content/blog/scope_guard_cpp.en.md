---
title: "Scope guard in C++"
lang: en
translated_from: it
auto_translated: false
date: 2026-06-27
desc: "How to use RAII for local rollback, early exits and conditional cleanup."
read: "4 min"
tags: ["C++", "RAII"]
categories: ["Programming", "Tutorial"]
image: "/blog/covers/scope_guard_cpp.webp"
---
## Introduction
In C++, fragile code is not always complex code.
Sometimes it is a plain function that changes some state, hits an error, and has to remember how to put everything back.

The common case is a temporary change, or a small operation with commit/rollback semantics.
As long as the function has one exit point, manual cleanup can look acceptable.
Once there are several `return` statements, validation checks or exceptions, the restore logic starts spreading through the function body.

A scope guard exists to avoid that.
It is a local object that runs a function when the scope exits, unless it is dismissed first.

## The problem
Take a small example.
We want to append a batch of values to a log, but if the batch contains an invalid value the log must return to its original size.

```cpp
auto commit_batch(std::vector<int>& log, std::vector<int> const& batch) -> bool {
  auto const mark{log.size()};

  for (auto const value : batch) {
    if (value < 0) {
      log.resize(mark);
      return false;
    }

    log.push_back(value);
  }

  return true;
}
```

This code is not wrong, but it has an obvious weakness: rollback lives inside the error branch.
If another check is added later, the same cleanup has to be remembered there too.

The problem is not `resize`.
The problem is that the function's guarantee is not declared in one place.

## RAII applied to a scope
RAII is usually used to tie a resource to an object's lifetime.
When the object leaves scope, the destructor releases the resource.

A scope guard applies the same idea to any function.
At the start of the scope, declare what must happen if the operation is not committed; at the end, if everything succeeded, dismiss the guard.

A minimal implementation can look like this.

```cpp
#include <concepts>
#include <type_traits>
#include <utility>

template <std::invocable Fn>
class [[nodiscard]] scope_guard final {
public:
  using function_type = Fn;

private:
  function_type m_fn;
  bool m_active{true};

public:
  explicit scope_guard(function_type fn
  ) noexcept(std::is_nothrow_move_constructible_v<function_type>)
      : m_fn{std::move(fn)} {}

  scope_guard(scope_guard const&) = delete;
  auto operator=(scope_guard const&) -> scope_guard& = delete;

  ~scope_guard() noexcept(noexcept(m_fn())) {
    if (m_active) {
      m_fn();
    }
  }

  auto dismiss() noexcept -> void {
    m_active = false;
  }
};

template <typename Fn>
scope_guard(Fn) -> scope_guard<Fn>;
```

The type is not complicated.
It stores a callable and a flag.
The destructor runs the callable only while the flag is still active.

## Rewriting the example
With a scope guard, rollback is declared next to the state it protects.

```cpp
auto commit_batch(std::vector<int>& log, std::vector<int> const& batch) -> bool {
  auto const mark{log.size()};

  auto rollback{scope_guard{[&] {
    log.resize(mark);
  }}};

  for (auto const value : batch) {
    if (value < 0) {
      return false;
    }

    log.push_back(value);
  }

  rollback.dismiss();
  return true;
}
```

Now the function says something important immediately: if we leave before confirmation, the log returns to its initial size.
The error branch does not need to know the rollback.
It only needs to stop the operation.

This is what makes a scope guard useful.
It is not about making the code clever; it is about placing the guarantee where it begins.

## When it works well
A scope guard fits small, local and easy-to-understand cleanup.
For example:

- restoring a variable's previous value;
- returning a container to its initial size;
- undoing a registration if initialization fails;
- closing or releasing a resource only if it was not transferred elsewhere.

It works best when there is a clear success condition.
Before that condition, rollback remains armed; after that condition, it can be dismissed.

## When to avoid it
Not everything should become a scope guard.
If cleanup must always happen, a dedicated RAII object or a simple `defer` is clearer.
If the operation involves several resources, multiple commit phases or detailed error propagation, model the transaction with an explicit type.

There is also an important detail: the function run by the destructor should not throw.
An exception during stack unwinding can lead to `std::terminate`, so scope guard cleanup should stay simple and predictable.

## Conclusion
A scope guard is a small application of RAII, but it solves a concrete problem: it prevents rollback from being duplicated across error branches.

When a function enters a protected section, declare immediately how to roll back.
When the section completes successfully, call `dismiss()`.
The result is less scattered code, with a local guarantee that is easier to read and maintain.
