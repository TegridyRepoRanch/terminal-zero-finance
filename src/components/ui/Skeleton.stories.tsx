import type { Meta, StoryObj } from '@storybook/react';
import {
  Skeleton,
  TableSkeleton,
  CardSkeleton,
  ChartSkeleton,
  SidebarSkeleton,
  StatCardsSkeleton,
} from './Skeleton';

/**
 * The Skeleton component provides loading placeholders for async content.
 * It helps improve perceived performance by showing users where content will appear.
 *
 * ## Usage
 * - Use `variant` prop to match the shape of the loading content
 * - Use `animation` prop to control the loading animation style
 * - Pre-built skeleton patterns available for common layouts
 */
const meta = {
  title: 'UI/Skeleton',
  component: Skeleton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['text', 'circular', 'rectangular'],
      description: 'The shape of the skeleton',
    },
    animation: {
      control: 'select',
      options: ['pulse', 'wave', 'none'],
      description: 'The animation style',
    },
    width: {
      control: 'text',
      description: 'Width of the skeleton (CSS value or number)',
    },
    height: {
      control: 'text',
      description: 'Height of the skeleton (CSS value or number)',
    },
  },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default rectangular skeleton with pulse animation.
 */
export const Default: Story = {
  args: {
    width: 200,
    height: 40,
  },
};

/**
 * Text skeleton for loading text lines.
 */
export const Text: Story = {
  args: {
    variant: 'text',
    width: 300,
  },
};

/**
 * Circular skeleton for avatars or profile pictures.
 */
export const Circular: Story = {
  args: {
    variant: 'circular',
    width: 64,
    height: 64,
  },
};

/**
 * Wave animation creates a shimmer effect.
 */
export const WaveAnimation: Story = {
  args: {
    animation: 'wave',
    width: 200,
    height: 40,
  },
};

/**
 * Static skeleton with no animation.
 */
export const NoAnimation: Story = {
  args: {
    animation: 'none',
    width: 200,
    height: 40,
  },
};

/**
 * Table skeleton pattern for loading tabular data.
 */
export const Table: Story = {
  render: () => (
    <div style={{ width: '600px' }}>
      <TableSkeleton rows={5} columns={4} />
    </div>
  ),
};

/**
 * Card skeleton pattern for loading card components.
 */
export const Card: Story = {
  render: () => <CardSkeleton />,
};

/**
 * Chart skeleton pattern for loading chart visualizations.
 */
export const Chart: Story = {
  render: () => (
    <div style={{ width: '600px' }}>
      <ChartSkeleton />
    </div>
  ),
};

/**
 * Sidebar skeleton pattern for loading navigation sidebars.
 */
export const Sidebar: Story = {
  render: () => (
    <div style={{ width: '300px' }}>
      <SidebarSkeleton />
    </div>
  ),
};

/**
 * Stat cards skeleton pattern for loading dashboard statistics.
 */
export const StatCards: Story = {
  render: () => (
    <div style={{ width: '800px' }}>
      <StatCardsSkeleton count={4} />
    </div>
  ),
};

/**
 * Example of multiple text lines with different widths.
 */
export const TextLines: Story = {
  render: () => (
    <div style={{ width: '400px' }} className="space-y-2">
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="90%" />
      <Skeleton variant="text" width="95%" />
      <Skeleton variant="text" width="85%" />
    </div>
  ),
};
