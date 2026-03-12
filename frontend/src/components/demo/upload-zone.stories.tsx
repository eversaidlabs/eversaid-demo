import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'
import { UploadZone } from './upload-zone'

const meta: Meta<typeof UploadZone> = {
  title: 'Demo/UploadZone',
  component: UploadZone,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    onFileSelect: fn(),
    onSpeakerCountChange: fn(),
    onTranscribeClick: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ width: '480px' }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof UploadZone>

export const NoFile: Story = {
  args: {
    selectedSpeakerCount: null,
    isUploading: false,
    uploadProgress: 0,
    hasFile: false,
  },
}

export const FileSelected: Story = {
  args: {
    selectedSpeakerCount: null,
    isUploading: false,
    uploadProgress: 0,
    hasFile: true,
  },
}

export const Uploading0: Story = {
  args: {
    selectedSpeakerCount: 2,
    isUploading: true,
    uploadProgress: 0,
    hasFile: true,
  },
}

export const Uploading50: Story = {
  args: {
    selectedSpeakerCount: 2,
    isUploading: true,
    uploadProgress: 50,
    hasFile: true,
  },
}

export const Uploading100: Story = {
  args: {
    selectedSpeakerCount: 2,
    isUploading: true,
    uploadProgress: 100,
    hasFile: true,
  },
}

export const SpeakerCount1: Story = {
  args: {
    selectedSpeakerCount: 1,
    isUploading: false,
    uploadProgress: 0,
    hasFile: true,
  },
}

export const SpeakerCount3: Story = {
  args: {
    selectedSpeakerCount: 3,
    isUploading: false,
    uploadProgress: 0,
    hasFile: true,
  },
}

export const SpeakerCount5Plus: Story = {
  args: {
    selectedSpeakerCount: 5,
    isUploading: false,
    uploadProgress: 0,
    hasFile: true,
  },
}
