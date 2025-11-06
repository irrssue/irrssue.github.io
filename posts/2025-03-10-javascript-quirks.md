---
title: "JavaScript Quirks I've Learned to Love"
date: "2025-03-10 09:45:00"
tags: ["javascript"]
summary: "The weird parts of JavaScript that actually make sense once you understand them."
cover: ""
draft: false
---

## TL;DR
- `==` vs `===` has logic behind it
- `this` binding follows clear rules
- Closures are beautiful, not confusing

## Context

JavaScript gets a bad rap. "WAT" videos make fun of `[] + []` and `{} + {}`. But most "quirks" follow consistent rules once you learn them.

## Main

### The Equality Operators

Everyone says "always use `===`" without explaining why `==` exists. But `==` has legitimate uses:

```javascript
if (value == null) {
  // Catches both null and undefined
}
```

This is cleaner than `value === null || value === undefined`.

### The `this` Keyword

Arrow functions don't have their own `this`. Regular functions do. That's not a bug - it's a feature. Arrow functions inherit `this` from their parent scope.

```javascript
// Works as expected
button.addEventListener('click', () => {
  this.handleClick(); // `this` is from parent scope
});
```

### Closures Are Your Friend

```javascript
function createCounter() {
  let count = 0;
  return () => ++count;
}
```

The inner function "remembers" `count`. That's not weird - it's powerful. Every React hook uses closures.

### The Real Issue

JavaScript's bad reputation comes from rushed tutorials and cargo-cult programming. Learn the fundamentals, and the "quirks" make sense.

## Takeaways

- Understand before judging
- Read the spec (seriously, it's readable)
- JavaScript isn't broken, just different
- Many "best practices" are oversimplifications
