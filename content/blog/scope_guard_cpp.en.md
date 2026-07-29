---
title: "Scope Guard in C++"
lang: en
translated_from: it
auto_translated: false
date: 2026-05-12
lastmod: 2026-07-10
desc: "Using RAII to keep rollback close to the state it protects."
read: "5 min"
tags: ["C++", "RAII"]
categories: ["Programming", "Tutorial"]
image: "/blog/covers/scope_guard_cpp.webp"
---

## Abstract

While reviewing functions with several exit paths, I noticed that the individual `return` statements were not the real problem. The risk came from the promise attached to them: unless the operation reached its commit point, something had to restore the original state.

That promise is easy to see while rollback appears in a single branch. Add another validation step, an exception, or one more phase to the operation, and the guarantee becomes scattered across the function. Its correctness then depends on every future edit remembering the same cleanup rule.

A scope guard places that rule where it begins. The code declares the rollback immediately, lets RAII cover every way out of the scope, and disarms the guard only after a successful commit. This article builds a deliberately small C++20 implementation and, more importantly, defines the limits that make it safe to use.

## The problem

Suppose a function appends a batch of values to a log. Its contract is precise: accept the entire batch if every value is valid; otherwise restore the log to its original size.

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

This works for the path shown, but the contract is fragile. Rollback lives inside one error branch, so every new exit path has to repeat `log.resize(mark)`.

There is also a less visible case: `push_back()` may throw, for example while allocating storage. That exception leaves the function without passing through the branch that performs the restore. If the function genuinely promises all-or-nothing behavior, cleanup cannot depend on the control-flow path that happened to fail.

## Moving the guarantee into the scope

RAII binds an action to an object's lifetime. When the object leaves its scope, its destructor performs the required cleanup: closing a file, releasing a resource, or restoring state.

A scope guard applies the same principle to one local action. It starts armed and stores a callable. If the scope ends while the guard is still active, the callable runs; once the operation commits, `dismiss()` disarms it.

The mechanism is small, but it changes where the guarantee lives. Rollback is no longer a repeated consequence of individual error branches. It becomes an object declared next to the state it protects.

## A minimal implementation

For this example I will use a deliberately small, non-transferable type. It is not intended to replace a complete library facility; its purpose is to make the mechanism visible.

```cpp
#include <concepts>
#include <functional>
#include <type_traits>
#include <utility>

template <typename Fn>
  requires std::invocable<Fn&> && std::move_constructible<Fn>
class [[nodiscard]] scope_guard final {
public:
  using function_type = Fn;

  explicit scope_guard(
    function_type fn
  ) noexcept(std::is_nothrow_move_constructible_v<function_type>)
      : m_fn{std::move(fn)} {}

  scope_guard(scope_guard const&) = delete;
  auto operator=(scope_guard const&) -> scope_guard& = delete;
  scope_guard(scope_guard&&) = delete;
  auto operator=(scope_guard&&) -> scope_guard& = delete;

  ~scope_guard() noexcept {
    if (m_active) {
      std::invoke(m_fn);
    }
  }

  auto dismiss() noexcept -> void {
    m_active = false;
  }

private:
  function_type m_fn;
  bool m_active{true};
};

template <typename Fn>
scope_guard(Fn) -> scope_guard<Fn>;
```

The type stores the callable and a flag indicating whether the guard remains active. The constraint uses `std::invocable<Fn&>` because the stored callable is invoked as an lvalue, not as a temporary object.

Both copying and moving are deleted. For a local guard, this leaves exactly one owner of the action and removes the possibility of executing it twice. A general-purpose implementation may support moves, but it must also disarm the source object correctly.

The destructor is explicitly `noexcept`. The registered action must therefore never let an exception escape: doing so terminates the program. This is not an implementation detail; it is part of the type's contract.

## Rewriting the example

Rollback can now sit beside the point where the original state is recorded.

```cpp
auto commit_batch(std::vector<int>& log, std::vector<int> const& batch) -> bool {
  auto const mark{log.size()};

  auto rollback{scope_guard{[&] { log.resize(mark); }}};

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

From this point on, a negative value, an exception, or another early `return` added after the guard's construction all pass through the same mechanism. Only the path that completes the batch calls `dismiss()`.

Here rollback shrinks a `std::vector<int>` to a size it has already reached, so it does not require another allocation or destroy objects with throwing destructors. The assumptions still matter: `batch` must be a different object from `log`, because appending to the same vector being iterated could invalidate its iterators.

The strong guarantee does not come from the guard in isolation. It also depends on a reliable rollback action and on mutations whose semantics remain compatible with that rollback.

## Standardization and existing implementations

The idea is well established. WG21 proposal P0052 specifies `scope_exit`, `scope_fail`, and `scope_success`; the Library Fundamentals TS v3 working draft exposes them in `std::experimental` through `<experimental/scope>`.

Actual availability still depends on the standard library and toolchain. In production code, I would therefore prefer a maintained and tested facility when the project already provides one. The implementation above remains useful for understanding the pattern and for tightly scoped local requirements.

## When it helps

A scope guard fits well when rollback is local and the commit point is obvious. Typical examples include:

- returning a container to its previous size;
- restoring the original value of a variable;
- undoing a registration when initialization fails;
- releasing a resource only if ownership is not transferred;
- keeping a function with several early exits readable.

The main benefit is not saving lines of code. It is making the guarantee visible without forcing the reader to reconstruct every possible control-flow path.

## When to avoid it

If an object represents a resource with its own lifetime, a dedicated RAII type communicates ownership and responsibility more clearly. If an operation is a transaction involving several resources, states, and commit phases, one lambda can become too generic; at that point I prefer an explicit transaction type.

Capture lifetimes also require attention. A guard is destroyed before objects declared earlier in the same scope, but it cannot safely refer to an object that has already been destroyed or returned. Declaration order is therefore part of correctness.

## Conclusion

A scope guard solves a concrete problem: running an action whenever a scope ends, regardless of the exit path. For rollback, it lets the code state its promise directly: “unless commit happens, restore the original state.”

The pattern is useful because it moves correctness out of the next editor's memory and into the structure of the function. It does not automatically make a transaction safe, nor does it replace a proper resource model. When rollback is local, short, and non-throwing, however, it keeps the guarantee exactly where it is easiest to verify.

## References

- [P0052R10 — Generic Scope Guard and RAII Wrapper for the Standard Library](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2019/p0052r10.pdf)
- [N4939 — C++ Extensions for Library Fundamentals, Version 3](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2023/n4939.html)
