type ConfirmOptions = {
  title: string;
  message?: string;
  confirmText: string;
  cancelText: string;
  destructive?: boolean;
};

/** React Native's Alert is a no-op on web, so use the browser dialog. */
export async function confirm({ title, message }: ConfirmOptions) {
  return window.confirm(message ? `${title}\n\n${message}` : title);
}
