# Application Flow System

This folder defines the **Permit Application Flow Framework**, which controls how different types of permit applications move through their lifecycle (draft → submitted → review → approved, etc.).

Each **flow** represents a unique combination of:

- `SubmissionType`
- `UserGroupType`
- `AudienceType`

and defines its own allowed **state transitions** and **callbacks**.

---

## How It Works

1. Every `PermitApplication` includes the `PermitApplicationStatus` concern.
2. That concern chooses the correct **flow class** from this folder based on the model’s linked types.
3. Each flow class inherits from `ApplicationFlow::Base` and defines its own events using **AASM**.

At runtime, a `PermitApplication` has a `.flow` object that knows how to transition between states.

---

## Folder Structure

```
application_flow/
├── base.rb                          # Shared AASM states, helpers, and logic
├── default.rb                       # Fallback flow if no match found
├── application_external_participant.rb
├── support_request_internal_contractor.rb
└── README.md                        # This file
```

---

## Common Concepts

### 1. Base Flow (`ApplicationFlow::Base`)

The base defines:

- All standard states (`:new_draft`, `:newly_submitted`, `:in_review`, `:approved`, etc.)
- Shared transitions like `submit`, `finalize_revision_requests`, `cancel_revision_requests`
- Common helper methods (e.g., `can_submit?`, `handle_submission`)

You should **not modify this file** unless you’re changing logic shared by _all_ flows.
**_TODO: Complete the refactor of the base class to pull out Participant Application only functionality._**

---

### 2. Type-Specific Flows

Each subclass represents one combination of types.  
For example:

```ruby
# app/models/concerns/application_flow/application_external_participant.rb
module ApplicationFlow
  class ApplicationExternalParticipant < Base
    aasm do
      event :review do
        transitions from: :newly_submitted, to: :in_review
      end

      event :approve do
        transitions from: :in_review, to: :approved
      end

      event :reject do
        transitions from: :in_review, to: :ineligible, after: :handle_ineligible_status
      end
    end
  end
end
```

and:

```ruby
# app/models/concerns/application_flow/support_request_internal_contractor.rb
module ApplicationFlow
  class SupportRequestInternalContractor < Base
    aasm do
      event :submit do
        transitions from: :new_draft,
                    to: :in_review,
                    after: :handle_support_request_submission
      end

      event :resolve do
        transitions from: :in_review, to: :approved
      end

      event :escalate do
        transitions from: :in_review, to: :revisions_requested
      end
    end

    # this can be handled in 2 ways, calling the shared base logic
    def handle_support_request_submission
      handle_submission   # Call shared Base logic
      assign_reviewer!
      NotificationService.publish_support_request_event(self)
    end

    # or by overriding the super class, note the the inherited class name must match the super.
    # def handle_submission
    #   super
    #   assign_reviewer!
    #   NotificationService.publish_support_request_event(self)
    # end
  end
end
```

---

## Adding a New Flows

To create a new flow for a new combination of types:

1. **Duplicate** an existing file under `application_flow/`
2. **Rename** the class to match your new flow
3. **Add or override events** as needed
4. **Update the map** in `PermitApplicationStatus`:

```ruby
FLOW_MAP = {
  ["application", "participant", "external"] => ApplicationFlow::ApplicationExternalParticipant,
  ["support_request", "participant", "internal"] => ApplicationFlow::SupportRequestInternalParticipant,
  ["invoice", "contractor", "external"] => ApplicationFlow::InvoiceExternalContractor
}.freeze
```

That’s it — the next time a `PermitApplication` is loaded with those linked types, it will automatically use the new flow.

---

## Testing / Debugging

In the Rails console:

```ruby
pa = PermitApplication.find(123)
pa.flow.class
# => ApplicationFlow::SupportRequestInternalContractor

pa.flow.aasm.events.map(&:name)
# => [:submit, :resolve, :escalate]

pa.flow.submit
pa.flow.resolve
pa.status
# => "approved"
```

---

## Gotchas & Best Practices

| Rule                                                           | Why                                                  |
| -------------------------------------------------------------- | ---------------------------------------------------- |
| Don’t use `super` unless overriding the _same_ method name     | Ruby only looks up identical method names            |
| If you make a new event callback, call base methods explicitly | e.g. `handle_submission`                             |
| Keep flow files small & explicit                               | Each file should be readable in 1 screen             |
| Avoid metaprogramming in flows                                 | Clarity > cleverness                                 |
| Use console to test transitions                                | `pa.flow.aasm.events.map(&:name)` shows what’s valid |

---

## Summary

| Combination                                   | Flow Class                                          | Example Behavior                               |
| --------------------------------------------- | --------------------------------------------------- | ---------------------------------------------- |
| `application` + `participant` + `external`    | `ApplicationFlow::ApplicationExternalParticipant`   | Normal submit → review → approve/reject        |
| `support_request` + `contractor` + `internal` | `ApplicationFlow::SupportRequestInternalContractor` | Submit → review immediately → resolve/escalate |
| Anything else                                 | `ApplicationFlow::Default`                          | Uses base transitions only                     |

## References

Here are some useful articles on state machines, inheritance, and composition:

- _Mastering State Machines in Ruby on Rails_[^1]
- _State Machines in Ruby: An Introduction_[^2]
- _Composition Over Inheritance — Ruby Science_[^3]

[^1]: https://medium.com/%40Seif_Eddine.N/mastering-state-machines-in-ruby-on-rails-060123b27a47
[^2]: https://blog.appsignal.com/2022/06/22/state-machines-in-ruby-an-introduction.html
[^3]: https://thoughtbot.com/ruby-science/composition-over-inheritance.html
