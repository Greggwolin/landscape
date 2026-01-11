# KNOWN ISSUES & PATTERNS

> DEPRECATED (2025-12-23): Consolidated into `docs/00_overview/IMPLEMENTATION_STATUS.md`.
> Retained for historical context; do not update here.

Reference document for Claude Code and Codex to avoid reintroducing solved bugs.

---

## 1. Auto-Scroll Bug on Page Mount

**Status:** RESOLVED  
**Last Occurrence:** December 2025  
**Severity:** High (makes pages unusable)

### Symptoms

- Page automatically scrolls to bottom on load
- Top content hidden and difficult to reach
- Occurs when navigating to pages with chat components

### Root Cause

Chat components using `scrollIntoView` in a useEffect that fires on mount:

```tsx
// ❌ BAD - This scrolls on every message change including initial load
useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages]);
```

The effect fires when:
1. Component mounts with empty messages
2. Chat history loads from API/cache
3. `scrollIntoView` scrolls entire page to the chat div at bottom

### Affected Components (Historical)

- `src/components/landscaper/ChatInterface.tsx`
- `src/app/components/new-project/LandscaperPanel.tsx`
- `src/app/projects/[projectId]/components/landscaper/AgentChat.tsx`

### Solution Patterns

**Pattern A: Input-Only Component (Preferred for embedded chat)**

For workspace/dashboard layouts where chat is a footer input, use a component that doesn't render message history:

```tsx
// ✅ GOOD - WorkspaceChatInput.tsx
export function WorkspaceChatInput({ projectId }: { projectId: string }) {
  const [input, setInput] = useState('');
  const { mutate: sendMessage, isPending } = useSendMessage(projectId);
  
  // Just input + send button
  // No message list, no messagesEndRef, no scrollIntoView
}
```

**Pattern B: User Interaction Guard (For full chat panels)**

When auto-scroll IS needed after user sends a message:

```tsx
// ✅ GOOD - Only scroll after user interaction
const userHasSentMessage = useRef(false);
const prevCount = useRef(0);

useEffect(() => {
  if (userHasSentMessage.current && localMessages.length > prevCount.current) {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }
  prevCount.current = localMessages.length;
}, [localMessages]);

const handleSend = () => {
  userHasSentMessage.current = true; // Enable scrolling only after first send
  // ... send logic
};
```

### Prevention Checklist

When creating or modifying chat components:

- [ ] Does this component need to display message history?
- [ ] If NO → Use input-only pattern (Pattern A)
- [ ] If YES → Use user interaction guard (Pattern B)
- [ ] Never use unguarded `scrollIntoView` in useEffect with message dependencies
- [ ] Test by navigating TO the page (not just refreshing)

### Debug Command

If scroll issues reappear, search for triggers:

```bash
grep -rn "scrollIntoView\|scrollTo\|autoFocus\|\.focus(" src/
```

---

## 2. [Template for Future Issues]

**Status:** [RESOLVED/OPEN/MONITORING]  
**Last Occurrence:** [Date]  
**Severity:** [High/Medium/Low]

### Symptoms
[What the user sees]

### Root Cause
[Technical explanation]

### Solution
[Code pattern or fix]

### Prevention
[How to avoid reintroduction]

---

*Last Updated: December 2025*
