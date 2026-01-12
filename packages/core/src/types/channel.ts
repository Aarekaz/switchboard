/**
 * Channel/room type
 */
export type ChannelType = 'text' | 'voice' | 'dm' | 'group_dm' | 'category' | 'unknown';

/**
 * Unified channel representation
 */
export interface Channel {
  /** Channel ID */
  id: string;
  /** Channel name */
  name: string;
  /** Channel type */
  type: ChannelType;
  /** Whether the channel is private/restricted */
  isPrivate: boolean;
  /** Channel topic/description (if applicable) */
  topic?: string;
}
