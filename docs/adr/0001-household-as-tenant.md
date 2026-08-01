# Tenant boundary is the Household, not the User

We are building an isolated multi-tenant app. Each household's data must be fully isolated from every other household's, with no cross-tenant leakage possible via a missing query scope.

We made the tenant boundary the **Household** rather than the individual User, because a home-expense app isnaturally shared: partners and roommates contribute to one set of books. A session resolves a `user_id`; every query is then authorized through that user's `household_id`. This keeps the isolation discipline identical to a user-scoped tenant model while matching real household behavior.

Considered: (a) tenant = single user — rejected, because it would prevent household sharing; (b) tenant = household with optional per-user expense ownership — deferred as unnecessary complexity for v1.
