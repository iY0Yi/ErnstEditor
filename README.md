# Ernst Editor

A modern GLSL shader editor with real-time Blender integration and interactive inline sliders.

![Ernst Editor Preview](https://via.placeholder.com/800x400/1e1e1e/ffffff?text=Ernst+Editor)

Ernst Editor is a specialized code editor designed for GLSL shader development, featuring real-time uniform value adjustment through interactive sliders that directly communicate with Blender.

## 🎯 New Feature: Inline Slider

Double-click on floating-point numbers in GLSL code to activate an interactive slider!

### How it works:
1. **Double-click on any floating-point number** (e.g., `0.5`, `1.25`, `3.14`)
2. **Interactive slider appears** above the number
3. **Adjust values in real-time** - changes are instantly sent to Blender
4. **Confirm changes** by double-clicking the slider
5. **Cancel changes** by clicking outside the slider area

### Example:
```glsl
float myValue = 0.5; // ← Double-click here!
vec3 color = vec3(1.0, 0.8, 0.3); // ← Or here!
```

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
- `npm run build-exe` - Build Windows executable (.exe)
- `npm run build` - Build source files only

### Getting Started

```bash
# Clone the repository
git clone https://github.com/yourusername/ErnstEditor.git
cd ErnstEditor

# Install dependencies
npm install

# Start development
npm run dev-electron
```

### Building for Distribution

```bash
# Build Windows executable
npm run build-exe

# Output: build/ErnstEditor-win32-x64/ErnstEditor.exe
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

## Technical Details

### WebSocket Communication
- **Port**: 8765
- **Message Format**: `{"type": "update_uniform", "data": {"value": 0.75}}`
- **Auto-reconnect**: Supported
- **Real-time updates**: 60 FPS capable

### GLSL Support
- **File types**: `.glsl`, `.frag`, `.vert`, `.vs`, `.fs`
- **Syntax highlighting**: Full GLSL language support
- **Auto-detection**: Floating-point numbers with regex pattern
- **Value ranges**: Automatic smart range calculation

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
🚀 Ernst WebSocket Server started on port 8765
🔌 Blender client connected
🎛️ Sending uniform to Blender: u_inline1f = 0.75
```

**Blender (Console):**
```
📨 Received: update_uniform -> {'value': 0.75}
🎛️ Updating uniform: u_inline1f = 0.75
```

## Architecture

### Core Components
- **InlineFloatManager**: Monaco Editor Widget integration
- **BlenderService**: WebSocket communication management
- **MarkerManager**: GLSL code manipulation and markers
- **SliderUI**: Interactive slider component

### File Structure
```
src/
├── components/gui/InlineFloat/
│   ├── index.tsx          # Main integration
│   ├── types.ts           # Type definitions
│   ├── markerUtils.ts     # Code manipulation
│   ├── sliderUI.ts        # UI component
│   └── styles.ts          # CSS styling
├── services/
│   ├── websocketServer.ts # WebSocket server
│   └── blenderService.ts  # Blender communication
└── renderer/App.tsx       # Main application
```

### Key Features
- 🎯 **Real-time sliders** for GLSL floating-point values
- 🔗 **WebSocket communication** with Blender
- 🎨 **Monaco Editor integration** with custom widgets
- 🖥️ **Cross-platform support** (Windows, macOS, Linux)
- 🎭 **Theming system** with dark mode
- 📁 **Project management** with file tree

## Command Line Usage

Ernst Editor supports opening files directly from the command line, making it perfect for Blender addon integration:

```bash
# Open a specific GLSL file
ErnstEditor.exe "path/to/shader.glsl"

# Blender addon integration example
subprocess.Popen(f'start /B ErnstEditor.exe "{shader_file_path}"', shell=True)
```

## Requirements

- **Windows**: Windows 10 or later (x64)
- **Development**: Node.js 18+ and npm

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Version

**Current Version**: 1.0.0 with Inline Slider Feature

## License

MIT License - see LICENSE file for details