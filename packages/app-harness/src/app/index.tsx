import React, { useEffect, useState } from 'react';
import { Button, Text, View } from 'react-native';
import SplashScreen from 'react-native-splash-screen';
import NewModuleButton from './NewModuleButton';
import { OrientationLocker, PORTRAIT, LANDSCAPE } from 'react-native-orientation-locker';
import { isPlatformAndroid, isPlatformIos } from '@rnv/renative';
import PushNotificationIOS from '@react-native-community/push-notification-ios';

const App = () => {
    const [showVideo, setShowVideo] = useState(false);
    useEffect(() => {
        SplashScreen.hide();
    }, []);

    useEffect(() => {
        console.log(isPlatformIos, 'isPlatformIos');
        if (!isPlatformIos) return;
        PushNotificationIOS.requestPermissions();
        PushNotificationIOS.addEventListener('notification', onRemoteNotification);
        PushNotificationIOS.addEventListener('register', onRegistered);
        PushNotificationIOS.addEventListener('registrationError', onError);

        return () => {
            PushNotificationIOS.removeEventListener('notification');
            PushNotificationIOS.removeEventListener('register');
            PushNotificationIOS.removeEventListener('registrationError');
        };
    });

    const onRegistered = (deviceToken) => {
        console.log(`Device Token: ${deviceToken}`);
    };

    const onError = (error) => {
        console.log(`Error on notification register: ${error}`);
    };

    const onRemoteNotification = (notification) => {
        const isClicked = notification.getData().userInteraction === 1;

        if (isClicked) {
            // Navigate user to another screen
        } else {
            // Do something else with push notification
        }
        // Use the appropriate result based on what you needed to do for this notification
        const result = PushNotificationIOS.FetchResult.NoData;
        notification.finish(result);
    };

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>ReNative Harness !!</Text>
            <Text>{`hermes: ${typeof HermesInternal === 'object' && HermesInternal !== null ? 'yes' : 'no'}`}</Text>
            {isPlatformAndroid ? (
                <>
                    <NewModuleButton />
                    <OrientationLocker
                        orientation={PORTRAIT}
                        onChange={(orientation) => console.log('onChange', orientation)}
                        onDeviceChange={(orientation) => console.log('onDeviceChange', orientation)}
                    />
                    <Button title="Toggle Video" onPress={() => setShowVideo(!showVideo)} />
                    {showVideo && (
                        <View>
                            <OrientationLocker orientation={LANDSCAPE} />
                            <View style={{ width: 320, height: 180, backgroundColor: '#ccc' }}>
                                <Text>Landscape video goes here</Text>
                            </View>
                        </View>
                    )}
                </>
            ) : null}
        </View>
    );
};

export default App;
