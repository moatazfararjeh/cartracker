import { Alert } from 'react-native';

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmText: string;
  cancelText: string;
  destructive?: boolean;
};

/** Native confirmation dialog; resolves true when the user confirms. */
export function confirm({ title, message, confirmText, cancelText, destructive }: ConfirmOptions) {
  return new Promise<boolean>((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
        {
          text: confirmText,
          style: destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
