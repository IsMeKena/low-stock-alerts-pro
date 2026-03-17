# Shopify Polaris Guide

A comprehensive guide for using Shopify Polaris design system in this app and future projects.

## What is Polaris?

Shopify Polaris is the official design system for building Shopify admin apps. It's a React component library that provides pre-built, accessible, and beautifully designed UI components that look and feel native in the Shopify Admin.

**Key Benefits:**
- **Consistency:** Components match Shopify Admin design language
- **Accessibility:** Built-in WCAG 2.1 compliance
- **Performance:** Pre-built, optimized components
- **Mobile-Friendly:** Responsive by default
- **Dark Mode:** Automatic theme support
- **Trust:** Users recognize familiar Shopify design patterns

## Installation & Setup

### 1. Install Dependencies

```bash
npm install @shopify/polaris @shopify/polaris-icons
```

### 2. Setup AppProvider in main.tsx

```typescript
import { AppProvider } from "@shopify/polaris";
import "@shopify/polaris/build/esm/styles.css";
import en from "@shopify/polaris/locales/en.json";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppProvider i18n={en}>
      <App />
    </AppProvider>
  </React.StrictMode>
);
```

The `AppProvider` wraps your entire app and provides:
- Polaris styling and theming
- Internationalization (i18n)
- Dark mode support
- Accessibility utilities

## Core Components

### Layout Components

#### Box
Generic container for layout and spacing.

```tsx
<Box paddingBlockStart="400" paddingBlockEnd="400">
  {children}
</Box>
```

Common padding tokens: `100`, `200`, `300`, `400`, `500`, `600`

#### Layout & Layout.Section
Main page layout grid system.

```tsx
<Layout>
  <Layout.Section>
    {/* Full width content */}
  </Layout.Section>
  
  <Layout.Section>
    {/* Full width content */}
  </Layout.Section>
</Layout>
```

#### BlockStack
Vertical stack of elements with consistent gap.

```tsx
<BlockStack gap="300">
  <Text>Item 1</Text>
  <Text>Item 2</Text>
  <Text>Item 3</Text>
</BlockStack>
```

Gap options: `100`, `150`, `200`, `300`, `400`, `500`, `600`

#### InlineStack
Horizontal stack of elements.

```tsx
<InlineStack gap="200" align="space-between">
  <Text>Left</Text>
  <Text>Right</Text>
</InlineStack>
```

Alignment: `start`, `center`, `end`, `space-between`, `space-around`

### Content Components

#### Card
Container for grouped content.

```tsx
<Card>
  <BlockStack gap="300">
    <Text as="h2" variant="headingMd">Title</Text>
    <Text as="p">Content</Text>
  </BlockStack>
</Card>
```

#### Text
Display text with semantic meaning.

```tsx
<Text as="h1" variant="headingLg">Heading</Text>
<Text as="p" variant="bodyMd" tone="subdued">Subdued text</Text>
<Text as="p" variant="bodySm" tone="critical">Error text</Text>
```

**Variants:** `headingXl`, `headingLg`, `headingMd`, `headingSm`, `headingXs`, `bodyLg`, `bodyMd`, `bodySm`

**Tone:** `default`, `success`, `warning`, `critical`, `info`, `subdued`

#### Banner
Alert/notification container.

```tsx
<Banner tone="success">
  <Text as="p">Success message</Text>
</Banner>

<Banner tone="critical">
  <Text as="p">Error message</Text>
</Banner>

<Banner tone="info">
  <Text as="p">Info message</Text>
</Banner>
```

### Form Components

#### TextField
Single-line text input.

```tsx
<TextField
  label="Email"
  type="email"
  value={value}
  onChange={(val) => setValue(val)}
  helpText="Enter your email address"
  autoComplete="email"
/>
```

#### Select
Dropdown selection.

```tsx
<Select
  label="Plan"
  options={[
    { label: "Free", value: "free" },
    { label: "Pro", value: "pro" },
  ]}
  value={selectedPlan}
  onChange={(val) => setSelectedPlan(val)}
/>
```

#### RadioButton
Single selection from options.

```tsx
<RadioButton
  label="Option 1"
  checked={selected === "option1"}
  onChange={() => setSelected("option1")}
/>
<RadioButton
  label="Option 2"
  checked={selected === "option2"}
  onChange={() => setSelected("option2")}
/>
```

#### Checkbox
Toggle a single option.

```tsx
<Checkbox
  label="Enable notifications"
  checked={enabled}
  onChange={(checked) => setEnabled(checked)}
  helpText="Send email notifications"
/>
```

#### Form & FormLayout
Structured form container.

```tsx
<Form onSubmit={handleSubmit}>
  <FormLayout>
    <TextField label="Name" value={name} onChange={setName} />
    <Select label="Plan" options={plans} value={plan} onChange={setPlan} />
    <Button submit>Save</Button>
  </FormLayout>
</Form>
```

### Action Components

#### Button
Call-to-action button.

```tsx
{/* Primary action */}
<Button onClick={handleClick} variant="primary">
  Save
</Button>

{/* Secondary action */}
<Button onClick={handleClick} variant="secondary">
  Cancel
</Button>

{/* Disabled state */}
<Button disabled>Disabled</Button>

{/* Loading state */}
<Button loading>Saving...</Button>
```

### Data Components

#### ProgressBar
Visual progress indicator.

```tsx
<ProgressBar progress={75} />

{/* With warning tone */}
<ProgressBar progress={85} tone="warning" />
```

#### Badge
Status or category label.

```tsx
<Badge tone="success">Active</Badge>
<Badge tone="warning">Pending</Badge>
<Badge tone="critical">Inactive</Badge>
<Badge tone="info">Free Plan</Badge>
```

## Spacing & Spacing Tokens

Polaris uses a consistent spacing system based on multiples of 4px.

```
100 = 4px
150 = 6px
200 = 8px
300 = 12px
400 = 16px
500 = 20px
600 = 24px
```

Use these tokens in `padding`, `margin`, `gap` props:

```tsx
<Box paddingBlockStart="300" paddingBlockEnd="400">
  <BlockStack gap="200">
    {children}
  </BlockStack>
</Box>
```

## Common Patterns for Shopify Apps

### Wizard/Stepper

```tsx
const [step, setStep] = useState(1);

return (
  <Layout>
    <Layout.Section>
      {/* Progress indicator */}
      <Box style={{ height: "8px", background: "#e0e0e0", borderRadius: "4px" }}>
        <div style={{ width: `${(step/totalSteps)*100}%`, height: "100%", background: "#167EFF" }} />
      </Box>

      {/* Step content */}
      {step === 1 && <StepOne />}
      {step === 2 && <StepTwo />}

      {/* Navigation */}
      <InlineStack gap="200" align="end">
        <Button onClick={() => setStep(step - 1)} disabled={step === 1}>
          Previous
        </Button>
        <Button onClick={() => setStep(step + 1)} variant="primary">
          Next
        </Button>
      </InlineStack>
    </Layout.Section>
  </Layout>
);
```

### Settings Page

```tsx
<Box paddingBlockStart="400">
  <Layout>
    <Layout.Section>
      <Card>
        <BlockStack gap="300">
          <Text as="h2" variant="headingLg">Settings</Text>
          <Form onSubmit={handleSave}>
            <FormLayout>
              <Select label="Plan" options={plans} value={plan} onChange={setPlan} />
              <TextField label="Email" value={email} onChange={setEmail} />
              <Button submit variant="primary">Save</Button>
            </FormLayout>
          </Form>
        </BlockStack>
      </Card>
    </Layout.Section>
  </Layout>
</Box>
```

### Dashboard with Cards

```tsx
<Box paddingBlockStart="400">
  <Layout>
    {/* Header */}
    <Layout.Section>
      <Card>
        <InlineStack align="space-between">
          <Text as="h1">Dashboard</Text>
          <Badge tone="success">Active</Badge>
        </InlineStack>
      </Card>
    </Layout.Section>

    {/* Metrics Grid */}
    <Layout.Section>
      <BlockStack gap="300">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <Card>
            <BlockStack gap="200">
              <Text as="h3">Metric 1</Text>
              <ProgressBar progress={75} />
              <Text as="p" variant="bodySm">75%</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="200">
              <Text as="h3">Metric 2</Text>
              <ProgressBar progress={50} />
              <Text as="p" variant="bodySm">50%</Text>
            </BlockStack>
          </Card>
        </div>
      </BlockStack>
    </Layout.Section>
  </Layout>
</Box>
```

## Responsive Design

Polaris components are **responsive by default**. No media queries needed!

- `BlockStack` changes to flex on mobile
- `InlineStack` with `wrap={true}` wraps on small screens
- `Layout.Section` adjusts width for mobile
- Components auto-size based on viewport

**Pro Tip:** Always test on mobile viewport to ensure good responsive behavior.

## Dark Mode Support

Polaris **automatically handles dark mode** based on Shopify Admin theme settings.

**No extra code needed!** Colors adjust automatically.

```tsx
// This will automatically be readable in light AND dark mode
<Text as="p" tone="subdued">Subdued text</Text>
```

## Accessibility Features

Polaris components include built-in accessibility:

- Semantic HTML (`TextField` → `<input>`, etc.)
- ARIA labels and descriptions
- Keyboard navigation support
- Screen reader friendly
- Color contrast compliant
- Focus management

**Always use:**
- `label` prop for form inputs
- `helpText` for additional context
- Semantic text variants (`as="h1"`, `as="p"`)

## Version Info

- **Polaris Version:** 13.9.5
- **React Version:** 18.3.1+
- **Node:** 18+

## Migration Checklist for New Projects

✅ Install Polaris and icons  
✅ Add AppProvider to main.tsx with i18n  
✅ Import Polaris CSS globally  
✅ Replace all custom CSS with Polaris components  
✅ Use Layout/Layout.Section for page structure  
✅ Use BlockStack/InlineStack for spacing  
✅ Use Card for content containers  
✅ Use form components (TextField, Select, etc.)  
✅ Remove all custom CSS files  
✅ Test responsive design on mobile  
✅ Verify dark mode works  
✅ Check keyboard navigation  

## Resources

- **Official Docs:** https://shopify.dev/docs/api/app-home/polaris-web-components
- **Component Playground:** https://polaris.shopify.com
- **Icon Library:** https://polaris-icons.shopify.com
- **Accessibility Guide:** https://shopify.dev/docs/api/app-home/polaris-web-components/accessibility

## Best Practices

1. **Always wrap your app with AppProvider**
2. **Use design tokens** (spacing, colors, typography) instead of hardcoding values
3. **Use tone props** instead of custom styling for status/feedback
4. **Prefer Polaris components** over custom HTML/CSS
5. **Test responsive design** - use browser DevTools mobile view
6. **Use help text** to guide users through forms
7. **Use proper semantics** with `as` prop in Text component
8. **Keep it simple** - Polaris is designed to be intuitive
9. **Use shadows sparingly** - Polaris handles elevation visually
10. **Never disable buttons without reason** - always provide helpful feedback

## Common Gotchas

❌ **Don't:** Use inline styles for layout spacing  
✅ **Do:** Use BlockStack/InlineStack with `gap` prop

❌ **Don't:** Create custom styled buttons  
✅ **Do:** Use Button component with `variant` prop

❌ **Don't:** Use custom color values  
✅ **Do:** Use `tone` props (success, warning, critical, info)

❌ **Don't:** Skip labels on form inputs  
✅ **Do:** Always provide `label` prop on inputs

❌ **Don't:** Forget to test dark mode  
✅ **Do:** Test in both light and dark themes

## Future App Guidelines

**All new Shopify apps should:**
1. Use Polaris from day 1
2. Follow this guide's patterns
3. Never create custom CSS for components
4. Always test responsive design
5. Ensure WCAG 2.1 AA compliance
6. Use Polaris icons from @shopify/polaris-icons

---

**Last Updated:** 2025-03-17  
**Refactored Apps:** low-stock-alerts v1.0.0
