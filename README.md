# Ernst Editor - Blender Integration

Connect Ernst Renderer Addon with Ernst Editor to reflect
real-time slider adjustments from the editor to Ernst Renderer rendering.

## Setup

### 1. Starting Ernst Editor

Start Ernst Editor.
The WebSocket server will automatically start on port 8765.

### 2. Connection

1. Open Blender
2. Click the link button at the right end of the 3D viewport header
3. Connection established

## Development

### Available Scripts

- `npm run dev-electron` - Start development environment with hot reload
- `npm run dist` - Build for distribution

### Getting Started

```bash
# Install dependencies
npm install

# Start development
npm run dev-electron
```

## Usage

### Basic Workflow

1. **Open shader file in Ernst Editor**
2. **Double-click on floating-point numbers**
   - A slider will appear
   - `+u_inline1f` is added after the number (automatically hidden)

3. **Move the slider**
   - Uniform values are sent to Blender in real-time
   - Blender viewport updates immediately

4. **Confirm the value**
   - Double-click the slider to confirm
   - Or click outside the area to revert to original value

### Supported Data

Currently supported data formats:
- **Single floating-point**: `float` value
- **vec3 support**: Planned for future implementation (up to 3 floating-point values)

## Troubleshooting

### Cannot Connect

1. **Confirm Ernst Editor is running**
2. **Check if port 8765 is available**
3. **Check firewall settings**

### Values Not Reflecting

1. **Try restarting Blender and reconnecting**

### Debug Information

Detailed logs are displayed in both Blender and Ernst Editor consoles:

**Ernst Editor (DevTools Console):**
```
Sending uniform to Blender: u_myShader = 0.75
Successfully sent uniform to Blender
```

**Blender (Console):**
```
Received: update_uniform -> {'name': 'u_myShader', 'value': 0.75}
Updating uniform: u_myShader = 0.75
Updated u_myShader = 0.75 in material 'ErnstTestMaterial'
```

## Future Plans

- [ ] vec3 support (RGB, XYZ coordinates, etc.)
