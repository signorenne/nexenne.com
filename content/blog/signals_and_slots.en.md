---
title: "Signals and Slots"
lang: en
translated_from: it
auto_translated: false
date: 2024-04-01
desc: "Starting from Qt's signal/slot model, I build a small modern C++ implementation."
read: "4 min"
tags: ["C++"]
categories: ["Programming"]
image: "/blog/covers/signals_and_slots.jpeg"
---
## Introduction
After working with Qt, I started wondering how a signal/slot mechanism could be implemented in modern C++.

Wikipedia defines it this way.

> [...] a language construct [...] which makes it easy to implement the Observer pattern while avoiding boilerplate code.
> The concept is that GUI widgets can send signals containing event information which can be received by other controls using special functions known as slots.
>
> -- Wikipedia

In simpler words, the signal/slot mechanism enables event-based communication between objects.
Several libraries implement this pattern very well; here I present a small personal implementation built mainly to understand the mechanism better.

## UML diagram
The following UML diagram summarizes the project structure.

![](/blog/images/signals_and_slots_uml.png)

## The code
Because the implementation uses templates, the code lives entirely in a header file.
The comments describe the responsibilities and behavior of the main components.

```cpp
#ifndef LIBSIGSLOTPP_INCLUDE_LIBSIGSLOTPP_SIGNAL_HPP_
#define LIBSIGSLOTPP_INCLUDE_LIBSIGSLOTPP_SIGNAL_HPP_

#include <functional>
#include <memory>

namespace sigslotpp {

typedef std::size_t IDType;

/**
 * @brief Interface ISlotConnection
 * It provides a simple interface that identifies the Slot and its main
 * connectivity operations.
 * ISignal can access private and protected regions for design purposes.
 */
class ISlotConnection {
 private:
  friend class ISignal;

  IDType id_;         ///< identifier and index into the signal slots vector.
  bool isConnected_;  ///< slot connection status.
  bool isBlocked_;    ///< slot connection block status.

 protected:
  /**
   * @brief Getter for the identifier
   * @return id_
   */
  IDType id() const noexcept { return id_; }

  /**
   * @brief Getter/Setter for the identifier
   * @return a reference to id_
   */
  IDType &id() noexcept { return id_; }

  /**
   * @brief Clears the slot connection
   * Where the real disconnection happens.
   * This gets called by the ISlotConnection::disconnect() function, the
   * implementation depends on the child subclasses.
   */
  virtual void clear() noexcept = 0;

 public:
  ISlotConnection() = delete;  // not needed but better for compilation error

  /**
   * @brief Primary constructor
   * @post id_ == id
   * @post isConnected__ == isConnected
   * @post isBlocked_ == isBlocked
   */
  explicit ISlotConnection(const IDType id, const bool isConnected = true,
                           const bool isBlocked = false) noexcept
      : id_(id), isConnected_(isConnected), isBlocked_(isBlocked) {}

  /**
   * @brief Destructor
   */
  virtual ~ISlotConnection() {}

 public:
  /**
   * @brief Checks the connection status
   * Used to see if a slot is still connected to a Signal
   */
  virtual bool isConnected() const noexcept { return isConnected_; }

  /**
   * @brief Checks if the connection is blocked
   * Used to temporarily disable slot invocation.
   * @return true if the slot invocation is blocked else false.
   */
  bool isBlocked() const noexcept { return isBlocked_; }

 public:
  /**
   * @brief Blocks the slot invocation
   * @post isBlocked_ == true
   */
  void block() noexcept { isBlocked_ = true; }

  /**
   * @brief Unblocks the slot invocation
   * @post isBlocked_ == false
   */
  void unblock() noexcept { isBlocked_ = false; }

  /**
   * @brief Disconnects the slot from the signal
   * @post isConnected_ == false
   */
  void disconnect() {
    if (isConnected_) {
      isConnected_ = false;
      clear();
    }
  }
};

/**
 * @brief Class Connection
 * This class allows interaction with an ongoing signal-slot connection and
 * exposes an interface to manipulate and query the status of this connection.
 * Note that Connection is not a RAII object, one does not need to hold one
 * such object to keep the signal-slot connection alive.
 */
class Connection {
 private:
  std::weak_ptr<ISlotConnection> slot_;  ///< the slot to manipulate and query

 public:
  Connection() = delete;  // not needed but better for compilation error

  /**
   * @brief Primary constructor
   * @param slot that will be handled by this connection
   */
  explicit Connection(std::weak_ptr<ISlotConnection> &&slot) : slot_(slot) {}

  /**
   * @brief Destructor
   */
  virtual ~Connection() {}

 public:
  /**
   * @brief Checks if this connection is still valid
   * To have this information just see if the std::weak_ptr is expired
   * @return true if the connection is valid else false
   */
  bool isValid() const noexcept { return !slot_.expired(); }

  /**
   * @brief Checks if the slot is still connected to its signal
   * @return true if the slot is still connected else false
   * @see ISlotConnection::isConnected()
   */
  bool isConnected() const noexcept {
    std::shared_ptr<ISlotConnection> d = slot_.lock();
    return d && d->isConnected();
  }

  /**
   * @brief Checks if the slot connection is blocked
   * @return true if the slot connection is blocked else false
   * @see ISlotConnection::isBLocked()
   */
  bool isBlocked() const noexcept {
    std::shared_ptr<ISlotConnection> d = slot_.lock();
    return d && d->isBlocked();
  }

  /**
   * @brief Blocks the slot invocation
   * @see ISlotConnection::block()
   */
  void block() noexcept {
    std::shared_ptr<ISlotConnection> d = slot_.lock();
    if (d) d->block();
  }

  /**
   * @brief Unblocks the slot invocation
   * @see ISlotConnection::unblock()
   */
  void unblock() noexcept {
    std::shared_ptr<ISlotConnection> d = slot_.lock();
    if (d) d->unblock();
  }

  /**
   * @brief Disconnects the slot from its signal
   * @see ISlotConnection::disconnect()
   */
  void disconnect() {
    std::shared_ptr<ISlotConnection> d = slot_.lock();
    if (d) d->disconnect();
  }
};

///////////////////////////////

/**
 * @brief Interface ISignal
 * It provides a simple interface that identifies the Signal and its essential
 * functions.
 */
class ISignal {
 protected:
  /**
   * @brief Getter for specified ISlotConnection identifier
   * @return id of the specified slot
   */
  IDType idOf(ISlotConnection *const slotPtr) const noexcept {
    return slotPtr->id();
  }

  /**
   * @brief Getter/Setter for specified ISlotConnection identifier
   * @return a reference to id of the specified slot
   */
  IDType &idOf(ISlotConnection *const slotPtr) noexcept {
    return slotPtr->id();
  }

 public:
  /**
   * @brief Destructor
   */
  virtual ~ISignal() {}

  /**
   * @brief Disconnect the slot from this signal
   * @param slot a pointer to the slot to disconnect from
   */
  virtual void disconnect(ISlotConnection *const slot) = 0;
};

/**
 * @brief Interface ISlot
 * It provides a simple interface that identifies the Slot and its core
 * invocation functionality.
 * @tparam Args... the argument types of the function to call
 */
template <typename... Args>
class ISlot : public ISlotConnection {
 private:
  ISignal &signal_;  ///< reference to the signal

 protected:
  /**
   * @brief Clears the slot connection
   */
  virtual void clear() noexcept override { signal_.disconnect(this); }

  /**
   * @brief Invokes the function
   * Where the function is really invoked.
   * This gets called by the ISlot::operator()() function, the
   * implementation depends on the child subclasses.
   * @param args the arguments of the function to call
   */
  virtual void invoke(Args... args) = 0;

 public:
  ISlot() = delete;  // not needed but better for compilation error

  /**
   * @brief Primary constructor
   * We have a reference that must be initialized, so no default constructor
   * allowed here.
   * @param id the slot identifier
   * @param signal the reference of the signal connected to this slot
   * @post signal_ points to the signal connected to this slot
   * @see ISlotConnection
   */
  ISlot(const IDType id, ISignal &signal) noexcept
      : ISlotConnection(id), signal_(signal) {}

  /**
   * @brief Invokes the function
   * Invokes or calls the function stored in the slot.
   * Take note that i add an extra template here for flexibility and design
   * purposes. As mentioned in Signal::emit() we use the signature here.
   * At the end it is used std::forward to forward lvalues as either lvalues
   * or as rvalues, depending on Params.
   * @see Signal::emit()
   * @param params the parameters of the function to call
   * @tparam ...Params types of the parameters of the function to call
   */
  template <typename... Params>
  void operator()(Params &&...params) {
    if (ISlotConnection::isConnected() && !ISlotConnection::isBlocked())
      invoke(std::forward<Params>(params)...);
  }
};

/**
 * @brief Class SimpleSlot
 * Basic slot that does not track anything and thus it is imperative that what
 * is called by the std::function must exceeds the lifetime of signal this
 * slot is connected to.
 * @tparam Args... the argument types of the function to call
 */
template <typename... Args>
class SimpleSlot final : public ISlot<Args...> {
 private:
  std::function<void(Args...)>
      function_;  ///< function to be invoked by this slot

 protected:
  /**
   * @copydoc ISlot::invoke()
   */
  void invoke(Args... args) override final {
    function_(std::forward<Args>(args)...);
  }

 public:
  SimpleSlot() = delete;  // not needed but better for compilation error

  /**
   * @brief Primary constructor
   * @param id the slot identifier
   * @param function to be invoked by this slot
   * @param signal the reference to the signal this slot is connected to
   * @see ISlot
   */
  SimpleSlot(const IDType id, std::function<void(Args...)> &&function,
             ISignal &signal) noexcept
      : ISlot<Args...>(id, signal),
        function_(std::forward<std::function<void(Args...)>>(function)) {}
};

/**
 * @brief Class TrackingSlot
 * Tracking slot that tracks an object with a std::weak_ptr, it is auto
 * disconnected upon expiration of the std::weak_ptr thus no need to take care
 * of complex object lifetime managment.
 * @tparam T the type of the object to track
 * @tparam Args... the argument types of the function to call
 */
template <typename T, typename... Args>
class TrackingSlot final : public ISlot<Args...> {
 private:
  std::function<void(Args...)>
      function_;  ///< function to be invoked by this slot
  std::weak_ptr<T>
      objectPtr_;  ///< the pointer to the object this slot is tracking

 protected:
  /**
   * @copydoc ISlot::invoke()
   */
  void invoke(Args... args) override final {
    // this is probably useless in signle thread
    auto sp = objectPtr_.lock();
    if (!sp) {
      ISlotConnection::disconnect();
      return;
    }
    if (ISlotConnection::isConnected()) {
      function_(args...);
    }
  }

 public:
  TrackingSlot() = delete;  // not needed but better for compilation error

  /**
   * @brief Primary constructor
   * @param id the slot identifier
   * @param objectPtr the pointer to the object to track
   * @param function to be invoked by this slot
   * @param signal the reference to the signal this slot is connected to
   * @see ISlot
   */
  TrackingSlot(const IDType id, std::weak_ptr<T> &&objectPtr,
               std::function<void(Args...)> &&function,
               ISignal &signal) noexcept
      : ISlot<Args...>(id, signal),
        function_(std::forward<std::function<void(Args...)>>(function)),
        objectPtr_(std::forward<std::weak_ptr<T>>(objectPtr)) {}

 public:
  /**
   * @brief Checks if the connection still there
   */
  bool isConnected() const noexcept override final {
    return !objectPtr_.expired() && ISlotConnection::isConnected();
  }
};

/**
 * @brief Class Signal
 * This class manages a collection of ISlots
 * @tparam R the return type of the function to call
 * @tparam Args... the argument types of the function to call
 */
template <typename R, typename... Args>
class Signal final : public ISignal {
 private:
  std::vector<std::shared_ptr<ISlot<Args...>>>
      slots_;  ///< slots connected to this Signal

  /**
   * @brief Disconnects the specified slot
   * @param slot the pointer to the slot to disconnect from
   * @post slots_.size() decremented by one
   */
  void disconnect(ISlotConnection *const slot) noexcept override final {
    IDType index = idOf(slot);
    if (!slots_.empty()) {
      std::swap(slots_[index], slots_.back());
      idOf(slots_[index].get()) = index;
      slots_.pop_back();
    }
  }

 public:
  /**
   * @brief Default constructor
   * @post slots_.size() == 0
   */
  Signal() noexcept : slots_() {}

  /**
   * @brief Destructor
   */
  virtual ~Signal() noexcept { disconnectAll(); }

  /**
   * @brief Move constructor
   * @see Signal::operator=()
   */
  Signal(Signal &&other) noexcept : slots_() { *this = std::move(other); }

  /**
   * @brief Move assignment operator
   * @return a reference to this
   * @post slots_ == other.slots_
   */
  Signal &operator=(Signal &&other) noexcept {
    if (this != &other) {
      slots_ = std::move(other.slots_);
    }
    return *this;
  }

  /**
   * @brief Connects a slot to the signal
   * Connects a std::function to the signal.
   * @param function the signal connects to
   * @return a Connection instance for managment purposes
   * @post slots_.size() incremented by one
   */
  Connection connect(std::function<R(Args...)> &&function) noexcept {
    IDType id = slots_.size();
    std::shared_ptr<ISlot<Args...>> slot =
        std::make_shared<SimpleSlot<Args...>>(
            id, std::forward<std::function<R(Args...)>>(function), *this);
    slots_.push_back(slot);
    return Connection(std::weak_ptr(slots_[id]));
  }

  /**
   * @brief Connects and tracks a slot to the signal
   * Connects a std::function to the signal but this time the slot is tracked
   * by a std::weak_ptr pointing to the object of type T. The purpose is to
   * disconnect this slot automatically upon said object destruction.
   * @param function the signal connects to
   * @param objectPtr pointer to the object to be tracked
   * @tparam T the type of the object to track
   * @return a Connection instance for managment purposes
   * @post slots_.size() incremented by one
   */
  template <typename T>
  Connection connect(std::weak_ptr<T> &&objectPtr,
                     std::function<R(Args...)> &&function) noexcept {
    IDType id = slots_.size();
    std::shared_ptr<ISlot<Args...>> slot =
        std::make_shared<TrackingSlot<T, Args...>>(
            id, std::forward<std::weak_ptr<T>>(objectPtr),
            std::forward<std::function<R(Args...)>>(function), *this);
    slots_.push_back(slot);
    return Connection(std::weak_ptr(slots_[id]));
  }

  /**
   * @brief Connects and tracks a slot to the signal
   * Convenience method to connect a member function.
   * Connects a function pointer to the signal.
   * The slot is tracked by a std::weak_ptr pointing to the object of type T.
   * The purpose is to disconnect this slot automatically upon said object
   * destruction.
   * @param function pointer the signal connects to
   * @param objectPtr pointer to the object to be tracked
   * @tparam T the type of the object to track
   * @return a Connection instance for managment purposes
   * @post slots_.size() incremented by one
   */
  template <typename T>
  Connection connect(std::shared_ptr<T> &objectPtr,
                     R (T::*function)(Args...)) noexcept {
    T *const ptr = objectPtr.get();
    return connect(std::weak_ptr<T>(objectPtr),
                   [ptr, function](Args... args) -> R {
                     return (ptr->*function)(args...);
                   });
  }

  /**
   * @brief Connects and tracks a slot to the signal
   * Convenience method to connect a const member function.
   * Connects a function pointer to the signal.
   * The slot is tracked by a std::weak_ptr pointing to the object of type T.
   * The purpose is to disconnect this slot automatically upon said object
   * destruction.
   * @param function pointer the signal connects to
   * @param objectPtr pointer to the object to be tracked
   * @tparam T the type of the object to track
   * @return a Connection instance for managment purposes
   * @post slots_.size() incremented by one
   */
  template <typename T>
  Connection connect(std::shared_ptr<T> &objectPtr,
                     R (T::*function)(Args...) const) noexcept {
    T *const ptr = objectPtr.get();
    return connect(std::weak_ptr<T>(objectPtr),
                   [ptr, function](Args... args) -> R {
                     return (ptr->*function)(args...);
                   });
  }

  /**
   * @brief Disconnects all the slots
   * Disconnects all the slots this signal is connected to.
   * @post slots_.empty() == true
   */
  void disconnectAll() noexcept { slots_.clear(); }

  /**
   * @brief Emits the signal
   * All non blocked and connected slot functions will be called
   * with supplied arguments.
   * Important explanation!
   * A template is used here, this is for flexibility and design purposes.
   * To this function can be passed rvalues or lvalues but if we use the Args
   * type it is basically precluding us to emit the signal when it is a
   * different types from Args. Suppose Signal<bool, int, double&> the matched
   * function is std::function<bool(int, double&)>. Now i can't emit something
   * like emit(5, 5.0) because 5.0 is a non const lvalue.
   * @see ISlot::operator()()
   * @param params arguments to emit
   * @tparam ...Params type of the parameter to emit
   */
  template <typename... Params>
  void emit(Params... params) {
    for (auto const &it : slots_) {
      it->operator()(params...);
    }
  }

  /**
   * @brief Gets the number of connected slots
   * @return slots.size()
   */
  std::size_t connectedSlots() const noexcept { return slots_.size(); }
};

}  // namespace sigslotpp

#endif  // LIBSIGSLOTPP_INCLUDE_LIBSIGSLOTPP_SIGNAL_HPP_
```

## Usage
To understand how to use the implemented solution, I'll show you the unit tests I wrote.

```cpp
const std::string ff = "free function";
const std::string mf = "member function";
const std::string smf = "static member function";
const std::string mo = "member operator";
const std::string l = "lambda";
const std::string gl = "generic lambda";

void f() { fmt::print("{}\n", ff); }

struct s {
  void m() { fmt::print("{}\n", mf); }
  static void sm() { fmt::print("{}\n", smf); }
};

struct o {
  void operator()() { fmt::print("{}\n, mo"); }
};

TEST_CASE("slots can be added and removed from the signal") {
  std::shared_ptr<s> d;
  auto lambda = []() { fmt::print("{}\n", l); };
  auto gen_lambda = [](auto &&...a) { fmt::print("{}\n", gl); };

  sigslotpp::Signal<void> sig;

  SUBCASE("connecting slots to signal increases connected slots") {
    auto c1 = sig.connect(f);
    sig.connect(d, &s::m);
    sig.connect(&s::sm);
    auto c2 = sig.connect(o());
    sig.connect(lambda);
    sig.connect(gen_lambda);
    CHECK(sig.connectedSlots() == 6);
  }

  SUBCASE("discconnecting all slots from the signal put size to zero") {
    auto c1 = sig.connect(f);
    auto c2 = sig.connect(o());
    sig.connect(lambda);
    sig.connect(gen_lambda);
    sig.disconnectAll();
    CHECK(sig.connectedSlots() == 0);
  }

  SUBCASE("disconnecting slots from signal decreases connected slots") {
    auto c1 = sig.connect(f);
    auto c2 = sig.connect(o());
    c1.disconnect();
    CHECK(sig.connectedSlots() == 1);
  }
}

TEST_CASE("signal can be emitted") {
  int x{0};
  auto lambda = [&x](int value) { x = x + value; };

  sigslotpp::Signal<void, int> sig;

  sig.connect(lambda);

  sig.emit(5);
  CHECK(x == 5);
  sig.emit(1);
  CHECK(x == 6);
  sig.emit(-6);
  CHECK(x == 0);
}

int sum = 0;
struct x {
  void f(int i) { sum += i; }
};

TEST_CASE("signal can be automatically disconnected") {
  auto a = std::make_shared<x>();
  sigslotpp::Signal<void, int> sig;
  sig.connect(a, &x::f);
  sig.emit(4);
  sig.emit(3);
  sig.emit(-2);
  CHECK(sum == 5);
  a.reset();
  sig.emit(9);
  CHECK(sum == 5);
  CHECK(sig.connectedSlots() == 0);
}

TEST_CASE("signal connection to slot can be blocked") {
  int x{0};
  auto lambda = [&x](int value) { x = x + value; };

  sigslotpp::Signal<void, int> sig;

  auto c1 = sig.connect(lambda);

  sig.emit(5);
  CHECK(x == 5);
  c1.block();
  sig.emit(1);
  CHECK(x == 5);
  c1.unblock();
  sig.emit(-6);
  CHECK(x == -1);
}
```

## Analysis
The classes involved are:

-   ISlotConnection
-   ISlot
-   SimpleSlot
-   TrackingSlot
-   ISignal
-   Signal
-   Connection

There is no need to walk through every class line by line, but two elements deserve a closer explanation: TrackingSlot and Connection.

### The TrackingSlot class
This class makes it possible, via a `std::weak_ptr`, to track the in-memory existence of a specific object.
To do that, from a design point of view, it requires the use of smart pointers, and in particular a `std::shared_ptr` to instantiate the object to be tracked.

When the `weak_ptr` is no longer able to `lock`, it means the tracked object has reached the end of its lifetime.

This slot is not removed immediately at the end of the tracked object's lifetime, but on the next `emit` of the signal it is connected to.

It is important to point out that this class does not interfere with the lifecycle of the tracked object.

### The Connection class
This class does not follow the RAII pattern.
It serves as an explicit access point to the connection between signal and slot.
Connection holds a reference, a `weak_ptr`, to the slot created as the result of a `signal.connect(...)` call.

The class can operate on the following slot features:

-   Disconnection
-   Blocking/unblocking the reception of a signal emission
-   Checking the state of the slot

It is important to point out that the lifecycle of this class does not affect the lifecycle of the slot.

## Open issues
There are some immediate functional gaps, namely:

1.  It is not thread-safe.
2.  I can't disconnect directly from the slot (imagine a signal that should only be emitted once).
3.  Method overloading.
4.  Methods with default values.
5.  There is no way to retrieve the slots' return value.

I do not address point 1 here, given the complexity of thread safety.

For point 4, I have not found a satisfying solution yet.

Issue 5 only exists for design reasons; I preferred not to implement it because it was unnecessary for the purpose of the Signal class.
In my implementation it is possible to connect to slots with return values, which are then transformed into slots with a void return.
To implement the return value you would need a helper vector in which to store the return of each slot, and to expose methods that let you read from it. Obviously each emit would overwrite that vector.

### Issue: disconnecting directly from the slot
The `Connection` class solves this problem directly.
The idea is to add an ExtendedSlot class with a Connection member variable, so the connection can be injected inside the `invoke` function. There is a trade-off, however: the connected function now needs to accept a Connection parameter.

Here is one possible solution.

We add an ExtendedSlot class.

```cpp
template <typename... Args>
class ExtendedSlot final : public ISlot<Args...> {
 private:
  std::function<void(Args...)>
      function_;  ///< function to be invoked by this slot
Connection connection_ ///< connection handle injected into the slot

 protected:

  void invoke(Args... args) override final {
    function_(connection_, std::forward<Args>(args)...);
  }

 public:

  ExtendedSlot(const IDType id, std::function<void(Args...)> &&function,
             ISignal &signal) noexcept
      : ISlot<Args...>(id, signal),
        function_(std::forward<std::function<void(Args...)>>(function)) {}

  // Not ideal, but enough for this implementation.
  void setConnection(Connection connection) { connection_ = connection }

};
```

We modify Signal and add a `connectExtended` method.

```cpp
 Connection connectExtended(std::function<R(Args...)> &&function) noexcept {
  IDType id = slots_.size();
  std::shared_ptr<ISlot<Args...>> slot =
      std::make_shared<ExtendedSlot<Args...>>(
          id, std::forward<std::function<R(Args...)>>(function), *this);
  slots_.push_back(slot);
  auto c = Connection(std::weak_ptr(slots_[id]));
  slots_[id]->setConnection(c);
  return c;
}
```

Usage would look like this.

```cpp
int main() {
  int i = 0;
  sigslot::signal<void> sig;

  auto f = [](auto &con) {
    i += 1;
    con.disconnect();
  };

  sig.connectExtended(f);
}
```

The limitation is that each slot now needs that Connection parameter, and it has to be the first argument.

### Issue: overloading
If we add the following support functions, we can solve this one too.

```cpp
template <typename T, typename R, typename... Args>
constexpr auto overload(R(I::*ptr)(Args...)) {
    return ptr;
}

template <typename R, typename... Args>
constexpr auto overload(R(*ptr)(Args...)) {
    return ptr;
}
```

Once expanded, the parameter pack makes the overload unambiguous:

```cpp
struct obj {
  void operator()(int) const {}
  void operator()() {}
};

struct foo {
  void bar(int) {}
  void bar() {}

  static void baz(int) {}
  static void baz() {}
};

void moo(int) {}
void moo() {}

int main() {
  sigslot::signal<void, int> sig;

  foo ff;
  sig.connect(overload<int>(&foo::bar), &ff);
  sig.connect(overload<int>(&foo::baz));
  sig.connect(overload<int>(&moo));
  sig.connect(obj());

  sig(0);

  return 0;
}
```

## Conclusion
We've seen how to implement a signal/slot mechanism.
The solution has clear limitations, but it provides a simple interface without hidden mechanisms.

With this foundation we can implement the observer pattern in a clear and controlled way.

At this [link](https://github.com/signorenne/cpp_playground/tree/main/signals_and_slots) you can find the project folder, which you can compile with CMake.
