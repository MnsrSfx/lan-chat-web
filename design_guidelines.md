# LanChat Mobile App - Design Guidelines

## Authentication Architecture

**Email/Password Authentication Required**
- Use email-based registration and login (NOT SSO)
- Welcome screen displays "Welcome to LanChat" branding
- Registration flow → Onboarding (language selection) → Profile setup
- Login screen: email field, password field, "Sign In" button, "Create Account" link
- Include "Forgot Password" link for password recovery

## Navigation Structure

**Tab Navigation (3 tabs)**
- Community (center focus) - Main discovery tab
- Chats - Message conversations
- Profile - User settings and profile management

## Screen Specifications

### 1. Welcome/Login Screen
- **Layout**: Full-screen with branding
- **Header**: None (full splash design)
- **Content**:
  - "Welcome to LanChat" hero text (large, centered)
  - Email input field with icon
  - Password input field with icon, show/hide toggle
  - "Sign In" primary button (full-width)
  - "Create Account" text link below
  - "Forgot Password?" link at bottom
- **Safe Area**: Standard insets (top + bottom)

### 2. Registration & Onboarding Flow
- **Step 1**: Email/password registration with confirmation
- **Step 2**: Select native language (searchable dropdown/modal)
- **Step 3**: Select languages to learn (multi-select with chips)
- Progress indicator showing 2/2 or 3/3 steps
- "Continue" button becomes active when requirements met

### 3. Profile Setup/Edit Screen
- **Header**: "Edit Profile" with Save (right) and Cancel (left) buttons
- **Layout**: Scrollable form
- **Photo Section**:
  - 4 photo upload slots in horizontal scrollable gallery
  - First photo is default avatar (marked with star icon)
  - Tap any photo to set as avatar
  - Empty slots show "+" icon to add photo
  - Each slot: 120x120dp rounded square
- **Form Fields**:
  - Display name
  - Native language (tap to change)
  - Learning languages (tap to modify)
  - Hobbies (multi-line text input)
  - Topics of interest (multi-line text input)
  - Age (number picker)
- **Safe Area**: Top: headerHeight + Spacing.xl, Bottom: insets.bottom + Spacing.xl

### 4. Community Tab
- **Header**: Transparent header with "Community" title and filter icon (right)
- **Filter Bar**: Horizontal scrollable pills below header
  - "All Members" (default selected)
  - "New Members"
  - "Online" toggle indicator
- **Age Filter**: Separate modal/sheet
  - Dual-handle range slider (18-65 years)
  - "Apply" and "Reset" buttons
- **User List**: Vertical scrollable cards
  - Each card shows:
    - Profile photo (left, 60x60dp circular)
    - Name and age (top right)
    - Native language → Learning language (small text)
    - Online status indicator (green dot if online)
    - Chat button (bottom right, icon only)
  - Visual feedback on card press
- **Safe Area**: Top: headerHeight + Spacing.xl, Bottom: tabBarHeight + Spacing.xl
- **Mock Users**: Include 5-8 bot profiles with diverse photos, names, and language pairs

### 5. User Profile View (Modal/Screen)
- **Header**: Back button (left), More menu (right: Report, Block)
- **Layout**: Scrollable with hero photo section
- **Photo Gallery**: 
  - Swipeable horizontal pager showing all 4 photos
  - Pagination dots below
  - Full-width photos (aspect ratio 4:3)
- **Profile Info Section**:
  - Name and age (large text)
  - Native language → Learning languages
  - Hobbies section with chips/tags
  - Topics of interest section with chips/tags
- **Action Buttons** (bottom, above safe area):
  - "Start Chat" primary button (full-width)
  - "Report Profile" secondary button (text only, smaller)
  - "Block User" secondary button (text only, smaller, red)
- **Safe Area**: Bottom: insets.bottom + Spacing.xl

### 6. Chats Tab
- **Header**: "Chats" title, search icon (right)
- **List**: Conversation previews
  - Avatar (left, 50x50dp)
  - Name and last message preview
  - Timestamp (right)
  - Unread badge if applicable
  - Swipe actions: Archive, Delete
- **Empty State**: Friendly illustration with "Start a conversation in Community"
- **Safe Area**: Top: headerHeight + Spacing.xl, Bottom: tabBarHeight + Spacing.xl

### 7. Chat Screen
- **Header**: User avatar + name (center), back (left), more menu (right)
- **Messages**: 
  - Sender bubbles aligned right (primary color)
  - Receiver bubbles aligned left (light gray)
  - Timestamp below each message group
  - Avatar shown for receiver messages
- **Long-Press Menu** (context menu):
  - "Translate to [Native Language]" (with globe icon)
  - "Copy" (with copy icon)
  - "Report" (with flag icon, red text)
- **Input Bar** (sticky bottom):
  - Text input field (multi-line, max 4 lines)
  - Send button (icon, disabled when empty)
- **Safe Area**: Top: headerHeight, Bottom: insets.bottom + input height

### 8. Profile Tab (Own Profile)
- **Header**: "Profile" title, settings icon (right)
- **Layout**: Scrollable
- **Photo Section**: Same as profile view but read-only display
- **Info Display**: Name, languages, hobbies, topics
- **Edit Profile Button**: Prominent, below info section
- **Settings Section**: 
  - Notification preferences
  - Language settings
  - Privacy settings
  - Log out
  - Delete account (nested, with confirmation)
- **Safe Area**: Top: headerHeight + Spacing.xl, Bottom: tabBarHeight + Spacing.xl

## Design System

### Colors
- **Primary**: #4A90E2 (blue, for language/learning theme)
- **Secondary**: #7B68EE (purple accent)
- **Success/Online**: #4CAF50 (green)
- **Error/Report**: #F44336 (red)
- **Text Primary**: #212121
- **Text Secondary**: #757575
- **Background**: #FFFFFF
- **Surface**: #F5F5F5
- **Border**: #E0E0E0

### Typography
- **Hero/Welcome**: 32pt, bold
- **Screen Titles**: 24pt, semi-bold
- **User Names**: 18pt, medium
- **Body Text**: 16pt, regular
- **Captions/Metadata**: 14pt, regular
- **Buttons**: 16pt, semi-bold

### Spacing
- xs: 4dp
- sm: 8dp
- md: 16dp
- lg: 24dp
- xl: 32dp

### Components
- **Buttons**: Rounded corners (8dp), minimum height 48dp
- **Input Fields**: Outlined style, 12dp radius, 48dp height
- **Cards**: Elevated with subtle shadow (2dp offset, 0.10 opacity, 3dp radius)
- **Avatars**: Circular with 2dp border in surface color
- **Photos**: Rounded corners (12dp for galleries, 8dp for thumbnails)
- **Chips/Tags**: Pill-shaped (24dp radius), small padding (8dp horizontal)

### Interaction Patterns
- All touchable elements: Scale down (0.97) on press
- List items: Ripple effect on Android, subtle highlight on iOS
- Floating action button (chat icon): Shadow (offset 0,2, opacity 0.10, radius 2)
- Modals: Slide up from bottom with backdrop (0.5 opacity black)
- Long-press: Haptic feedback + context menu after 500ms
- Photo upload: Native image picker with crop option

### Assets Required
- **App Icon**: LanChat logo (globe + chat bubble concept)
- **Bot Avatars**: Generate 5-8 diverse, friendly avatar illustrations
  - Mix of genders and ethnicities
  - Consistent art style (flat, friendly, modern)
  - Warm, welcoming expressions
- **Empty State Illustrations**: 
  - No chats yet (friendly conversation theme)
  - No matches found (search/filter theme)
- **Icons**: Use Feather icons from @expo/vector-icons for all UI icons

### Accessibility
- Minimum touch target: 48x48dp
- Color contrast ratio: 4.5:1 for text
- Form field labels and placeholders clearly visible
- Screen reader support for all interactive elements
- Translation and report features clearly labeled