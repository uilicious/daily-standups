# Application Features & Modules

This document details the secondary features, customization capabilities, and module behaviors in Daily Standups.

---

## 1. Customizable Standup Questions

Rather than enforcing rigid standup prompts, teams can customize their question set:

- **Per-Team Prompts**: Each team can define its own list of standup questions.
- **Ordering & Reordering**: Questions can be reordered using up/down controls.
- **Required vs. Optional**: Questions can be flagged as mandatory or optional.
- **Default Questions**: If no custom questions exist, the system automatically provisions standard prompts:
  1. *What did you do yesterday (or the previous working day)?* (Required)
  2. *What are you working on today?* (Required)
  3. *Any blockers? And who do you need help from?* (Optional)
- **Permissions**: Questions can be managed by System Administrators and assigned Team Managers.

---

## 2. Team Posts & Hand-Off Updates

Teams can share general context and structured handovers directly in the team feed:

- **Standard Posts**: General announcements, discussions, and updates visible in the team feed.
- **Hand-Off Posts**: Targeted handover updates created ahead of planned absences or project shifts.
  - Supports setting a **Target Date** (e.g., date when coverage starts).
  - Displays distinct hand-off badges in the feed to clearly distinguish them from regular standups.
- **Feed Integration**: Posts appear alongside standups on the selected date or can be filtered.

---

## 3. User Profiles & Animal Avatars

User customization and profile settings are accessible via the profile view:

- **Account Settings**: Update display name, email, and password.
- **12 Curated SVG Animal Avatars**:
  - Black Cat, Dog, Sheep, Panda, Tiger, Lion, Rabbit, Bear, Koala, Monkey, Penguin, Owl.
- **Custom Profile Photo Upload**:
  - Direct image upload supporting standard image formats.
  - Server supports body uploads up to 5MB.
- **Fallback Avatars**: Automatic avatar generation via DiceBear if no custom avatar or animal avatar is selected.

---

## 4. Role-Based Access Control (RBAC)

The application enforces a 3-tier role hierarchy:

| Role | Scope | Permissions |
|---|---|---|
| **System Admin** | Global | Manage all teams, users, global settings, question sets, and system roles. |
| **Team Manager** | Scoped to assigned teams | Add/remove team members, assign team roles, and customize team questions. |
| **Member** | Team-level | Submit daily standups, post team updates, and view team schedules and feeds. |

---

## 5. Rich Markdown Editor

Standup answers and posts support formatted text:

- **Formatting Toolbar**: Quick-insert buttons for bold, italic, bulleted lists, inline code, fenced code blocks, and markdown links.
- **Live Preview Tab**: Instant tabbed preview to check formatted text before submission.
- **Secure Rendering**: HTML output is sanitized with `DOMPurify` to safeguard against script injection.
