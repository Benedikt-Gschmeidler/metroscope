# Metro Style Visualization Tool for Dutch Railway Delays in 2024

Exploring the use of the **Metro Map Metaphor** for visualizing dynamic networks. This tool explores how the metro map metaphor can be used in dynamic networks by applying it to the Dutch railway network and visualizing delays over time.

## Key Features

- **Dynamic Visualization**: Delays are visualized via the thickness of the track lines.
- **Interactive Timeline**: Scrub through 2024 with adjustable granularity (**Day**, **Week**, **Month**) to reveal seasonal trends and incident impacts. Delays are aggregated by granularity: circle size encodes delay magnitude, while position and color identify the line.
- **Precision Controls**:
    - **Sensitivity**: Adjust how much the delay affects the thickness of the line.
    - **Base Width**: Choose the minimum thickness of lines.
    - **Scaling Modes**: Toggle between Absolute (fixed) and Relative (adaptive) scaling for flexible analysis.
- **Deep Dive Analytics**: Click on any line to open the **Info Panel**, revealing a more concise overview of the delays on that line.
- **Keyboard Shortcuts**:
    - `Space`: Pause / Play the timeline.
    - `Ctrl` + `Move`: Snap the legend to your cursor for instant data reading.

## Getting Started

### Prerequisites

- **Node.js**
- **pnpm**

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/Benedikt-Gschmeidler/metro-thesis.git
    cd metro-thesis
    ```

2.  Install dependencies:
    ```bash
    pnpm install
    ```

3.  Preprocess the delay data (first time only, or when delay data changes):
    ```bash
    pnpm preprocess
    ```

### Running the App

Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Production Build

To create an optimized production build:

```bash
pnpm build
```

## Scripts

| Script | Description |
| :--- | :--- |
| `pnpm dev` | Starts the development server. |
| `pnpm build` | Builds the application for production. |
| `pnpm lint` | Runs ESLint to ensure code quality. |
| `pnpm preprocess` | Generates optimized delay data from raw sources. Run this when delay data changes. |