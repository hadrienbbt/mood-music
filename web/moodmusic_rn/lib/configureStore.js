import { createStore,applyMiddleware,compose } from 'redux'
import { createLogger } from 'redux-logger'
import thunkMiddleware from 'redux-thunk'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import { reactReduxFirebase } from 'react-redux-firebase'
import { composeWithDevTools } from 'redux-devtools-extension'

import firebase from 'firebase'

import reducers from '../reducers'
import conf from '../private/conf'

firebase.initializeApp(conf.firebaseConfig)

const loggerMiddleware = createLogger({predicate: () => __DEV__}),

    rrfConfig = {
        userProfile: 'users',
        enableRedirectHandling: false,
        // useFirestoreForProfile: true // Firestore for Profile instead of Realtime DB
    },

    persistConfig = {
        key: 'root',
        storage,
        whitelist: [],
    },

    persistedReducer = persistReducer(persistConfig, reducers),

    enhancer = composeWithDevTools(
        applyMiddleware(thunkMiddleware, loggerMiddleware),
        reactReduxFirebase(firebase, rrfConfig)
    )

export default () => {
    let store = createStore(persistedReducer,{},enhancer)
    let persistor = persistStore(store)
    return { store, persistor }
}