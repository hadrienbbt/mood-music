/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react'
import {
    Platform,
    StyleSheet,
    Text,
    View,
    Button,
} from 'react-native'

import Spotify from 'react-native-spotify'
import { clientID,redirectURL } from '../private/conf'

Text.defaultProps.allowFontScaling = false

type Props = {}

export default class App extends Component<Props> {

    constructor(props) {
        super(props)

        this.state = {
            spotifyIsInitialized: false,
            user: null,
        }
        if (Spotify) this.initializeSpotify()
    }

    initializeSpotify = () => Spotify.initialize({
        clientID: clientID,
        redirectURL: redirectURL,
        scopes: [],
    }, (loggedIn, error) => {
        if(!error) {
            this.setState({spotifyIsInitialized: true})
            if(loggedIn) this.getUserInfos()
        }
    })
    
    getUserInfos = () => Spotify.getMe((me,error) => {
        console.log(me)
        if(!error) this.setState({user: me})
        else alert(JSON.stringify(error))
    })

    getMoodmusicInfos = () => {
        fetch(`http://www.moodmusic.fr/api/user/${this.state.user.id}/top-artists`, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        })
            .then((response) => response.json())
            .then((responseJson) => {
                this.setState({user: {
                    ...this.state.user,
                    top_artists: responseJson
                }})
                alert(JSON.stringify(this.state.user.top_artists))
            })
            .catch((error) => {
                console.error(error);
            });
    }

    spotify = () => {
        Spotify.login((loggedIn,error) => {
            if(!error) {
                if (loggedIn) this.getUserInfos()
            }
            else alert(JSON.stringify(error))
        })
    }

    render = () => (
        <View style={styles.container}>
            {this.state.spotifyIsInitialized ?
                this.state.user ? (
                    <View>
                        <Text>{`Bienvenue ${this.state.user.display_name} !`}</Text>
                        <Button title={"Obtenir les informations de Moodmusic"}
                                onPress={() => this.getMoodmusicInfos()}
                                style={styles.button}
                        />
                    </View>
                ) : (
                    <Button title={"Connexion avec Spotify"}
                            onPress={() => this.spotify()}
                            style={styles.button}
                    />
            ) : (
                <Text>En attente de Spotify...</Text>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5FCFF',
    },
    button: {
        fontSize: 20,
        textAlign: 'center',
        margin: 10,
    },
})
