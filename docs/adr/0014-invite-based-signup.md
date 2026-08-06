# Signup via invite creates user directly in inviter's household

The original invite flow: signup always created a new household (with the user as owner), then the invite page required a separate "Accept" click to move the user. This created a throwaway household and a confusing UX.

Now the signup API accepts an optional `inviteToken`. When present:
- The invite is validated (exists, not expired, email matches)
- The user is created directly in the **inviter's household** as a `member`
- The invite is marked as accepted
- No household is created

The signup page reads `?next=/invite?token=...` from the URL and passes `inviteToken` to the API. The household-name field is hidden when signing up via invite, and the heading says "Join household".

For existing users accepting an invite: the `acceptInvite` function moves their `householdId` to the inviter's household (overwriting their old one). A warning is shown on the invite page for logged-in users with owner role.
