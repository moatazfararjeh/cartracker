// Adopts the UIKit scene-based life cycle on iOS.
//
// Apps built with the iOS 27 SDK fail to launch without it ("UIScene life cycle is required").
// Expo SDK 57 ships `ExpoAppSceneDelegate` for this, but the prebuild template still creates the
// window in the app delegate, so this plugin wires the scene delegate in on every prebuild.
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const SCENE_DELEGATE = `
// Added by plugins/with-scene-lifecycle.js: creates the window and starts React Native per scene.
class SceneDelegate: ExpoAppSceneDelegate {}
`;

function withSceneManifest(config) {
  return withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return config;
  });
}

function replaceOnce(contents, pattern, replacement, description) {
  if (!pattern.test(contents)) {
    throw new Error(`with-scene-lifecycle: could not find ${description} in AppDelegate.swift`);
  }
  return contents.replace(pattern, replacement);
}

function withSceneAppDelegate(config) {
  return withAppDelegate(config, (config) => {
    if (config.modResults.language !== 'swift') {
      throw new Error('with-scene-lifecycle: expected a Swift AppDelegate');
    }
    let contents = config.modResults.contents;
    if (contents.includes('class SceneDelegate')) {
      return config;
    }

    // Let ExpoAppSceneDelegate fetch the React Native factory from the app delegate.
    contents = replaceOnce(
      contents,
      /class AppDelegate: ExpoAppDelegate \{/,
      'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {',
      'the AppDelegate class declaration'
    );

    // The scene delegate now creates the window and starts React Native.
    contents = replaceOnce(
      contents,
      /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\)\n#endif\n/,
      '',
      'the window setup in didFinishLaunchingWithOptions'
    );

    config.modResults.contents = contents + SCENE_DELEGATE;
    return config;
  });
}

module.exports = function withSceneLifecycle(config) {
  return withSceneAppDelegate(withSceneManifest(config));
};
