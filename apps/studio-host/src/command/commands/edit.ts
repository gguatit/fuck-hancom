import { editCommands as upstreamEditCommands } from '@upstream/command/commands/edit';
import type { CommandDef } from '@upstream/command/types';

type PasteCapableInputHandler = {
  performPaste?: () => void | Promise<void>;
};

type DeleteCapableInputHandler = {
  performDelete?: () => void;
};

const hopEditCommandById = new Map<string, CommandDef>([
  ['edit:paste', {
    id: 'edit:paste',
    label: '붙이기',
    icon: 'icon-paste',
    shortcutLabel: 'Ctrl+V',
    canExecute: (ctx) => ctx.hasDocument,
    execute(services) {
      void (services.getInputHandler() as PasteCapableInputHandler | null)?.performPaste?.();
    },
  }],
  ['edit:delete', {
    id: 'edit:delete',
    label: '지우기',
    icon: 'icon-delete',
    shortcutLabel: 'Ctrl+E',
    canExecute: (ctx) => ctx.hasDocument,
    execute(services) {
      (services.getInputHandler() as DeleteCapableInputHandler | null)?.performDelete?.();
    },
  }],
]);

export const editCommands: CommandDef[] = upstreamEditCommands.map((command) =>
  hopEditCommandById.get(command.id) ?? command,
);
