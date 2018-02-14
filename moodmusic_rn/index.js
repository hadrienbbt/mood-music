import React from 'react'
import { AppRegistry } from 'react-native'

import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/lib/integration/react'
import configureStore from './lib/configureStore'

import App from './src/App'

const { store,persistor } = configureStore(),

    ReduxLayer = () => (
        <Provider store={store}>
            <PersistGate loading={null} persistor={persistor}>
                <App />
            </PersistGate>
        </Provider>
    )

AppRegistry.registerComponent('moodmusic', () => ReduxLayer)
