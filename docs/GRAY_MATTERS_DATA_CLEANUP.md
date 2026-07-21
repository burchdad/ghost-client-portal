# Gray Matters Data Cleanup

Use the organization detail page to replace placeholder fields. Required real values are primary contact name, title, email, billing contact name, and billing email.

Production saves reject known placeholders such as `client@example.com`, `Primary Contact`, `Placeholder`, `Sample`, `Seed`, and `localhost`.

Every cleanup save requires an audit reason and records previous safe values, new safe values, actor, timestamp, and correlation ID.
