---
title: "Scope guard in C++"
lang: en
translated_from: it
auto_translated: false
date: 2026-06-27
desc: "How to use RAII to keep rollback close to the state it protects."
read: "4 min"
tags: ["C++", "RAII"]
categories: ["Programming", "Tutorial"]
image: "/blog/covers/scope_guard_cpp.webp"
---
## Introduction
Many functions look simple until the first error appears.
They change some state, perform a few checks, and, if something goes wrong, they have to bring everything back to the starting point while leaving the program in a coherent state.

The fragility appears when rollback has to be written in every single exit path.
At first it looks manageable: one `return`, one check, one restore call.
Then another `return` appears, then another check, and perhaps an exception.
At that point, the cleanup guarantee is no longer a visible rule, but a detail spread through the function, something the next person editing the code has to remember to preserve.

A scope guard makes that rule explicit.
When a delicate scope begins, the code immediately declares what must happen if the operation does not reach its successful end.
If the happy path is reached, the guard is dismissed; if the function exits earlier, rollback runs automatically.

## The problem
The starting point is a function that appends a batch of values to a log.
The rule is simple: if every value is valid, the batch is accepted; if an invalid value appears, the log must return to its original size.

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

The code works, but the contract is fragile.
Rollback is written directly in the error branch, so the guarantee depends on every new exit path repeating the same gesture.
If another check were added in the future, the code would have to remember to call `resize` again.

The point is that the function promises something precise: either it completes everything correctly, or it returns to the initial state.
That promise should have a stable place in the code, close to the state that rollback has to protect.

## Bringing the guarantee into the scope
RAII ties a resource to an object's lifetime.
When the object leaves scope, the destructor performs the required cleanup: closing a file, releasing memory, restoring state.

A scope guard applies the same idea to a single action.
Instead of copying rollback into every exit path, the code creates a local object that knows what to do when the scope ends.
As long as the guard is active, leaving the scope means running that action.

A possible implementation can look like this.

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

The type contains two pieces of information: the callable to run and a flag that says whether the guard is still armed.
On destruction, if the flag is active, the callable is invoked.
`dismiss()` represents the commit: the operation succeeded, so rollback no longer has to run.

## Rewriting the example
With a scope guard, the function's logic changes very little.
What changes is where the responsibility for rollback lives.

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

Immediately after saving `mark`, the code also declares how to go back.
From that moment on, every early exit goes through the same mechanism.

The error branch no longer needs to know the details of the restore.
It only stops the operation.
Rollback remains tied to the state it protects, and the function becomes easier to modify without introducing omissions.

## When it is useful
A scope guard works well when the restore is local and the success condition is clear.
Before the commit, the guard stays active; after the commit, it is dismissed.

Typical examples:

- returning a container to its previous size;
- restoring the original value of a variable;
- undoing a registration if initialization fails;
- releasing a resource only if it is not transferred elsewhere;
- keeping a function with several early exits readable.

The main advantage is not reducing the number of lines, but placing the guarantee next to the point where it begins.
The reader does not have to inspect every exit path to understand whether rollback ran or not: the protected state and the restoring action are visible immediately.

## When to avoid it
A scope guard should not replace every other form of state or resource management.
If an action must always run, without a commit condition, a dedicated RAII type or a simple `defer` is often clearer.

If the operation is a transaction with several resources and several commit phases, a lambda inside a scope guard can become too generic.
In that case, it is better to model the transaction with an explicit type, with its own names and states.

There is also a practical constraint: the action run by the destructor should not throw.
If a destructor throws during stack unwinding, the program can terminate with `std::terminate`.
For that reason, a scope guard works best with short, predictable, preferably `noexcept` actions.

## Conclusion
A scope guard solves a concrete problem: guaranteeing that an operation runs when a scope exits.
It is a small pattern, but it moves rollback out of the memory of whoever edits the function and into the point where the code declares its promise.
