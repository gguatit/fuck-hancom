import type { CommandDef } from '@/command/types';

export const aiCommands: CommandDef[] = [
  {
    id: 'view:ai-chat',
    label: 'AI Assistant',
    icon: 'icon-ai',
    canExecute: () => true,
    execute(services, params) {
      services.eventBus.emit('toggle-ai-chat', params ?? {});
    },
  },
];
