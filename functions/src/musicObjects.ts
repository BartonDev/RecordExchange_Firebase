import { IdHash } from "./idHash"
import {Spotify, Apple, Firestore} from "./apiInterfaces"
import {ObjectType} from "./musicEnums"
import {msToStandard, sanitizeStringBasic, sanitizeStringComplex} from "./stringExtensions"

export enum MatchValue {different, similar, match}

// export class MatchResult {
//     value: MatchValue
//     namePercentage: number
//     artistPercentage: number
//     albumPercentage: number

//     constructor(value: MatchValue, namePercentage: number = 0, artistPercentage: number = 0 , albumPercentage: number = 0){
//         this.value = value

//         if (this.value == MatchValue.exactMatch){
//             this.namePercentage = 1
//             this.artistPercentage = 1
//             this.albumPercentage = 1
//         } else if (this.value == MatchValue.nonMatch) {
//             this.namePercentage = 0
//             this.artistPercentage = 0
//             this.albumPercentage = 0
//         } else {
//             this.namePercentage = namePercentage
//             this.artistPercentage = artistPercentage
//             this.albumPercentage = albumPercentage
//         }
        
//     }
// }

export class ComparisonResult {
    nameResult: MatchValue
    artistResult: MatchValue
    albumResult: MatchValue
    value: number
    constructor(nameResult: MatchValue, artistResult: MatchValue, albumResult: MatchValue){
        this.nameResult = nameResult
        this.artistResult = artistResult
        this.albumResult = albumResult

        this.value = nameResult * 15 + artistResult * 10 + albumResult * 1
    }
}

export class Track {
    name: string
    artist: string
    album: string 
    coverImage: string;
    duration: string;

    constructor(name: string, artist: string, album: string, coverImage: string, duration: string){
        this.name = name
        this.artist = artist
        this.album = album
        this.coverImage = coverImage
        this.duration = duration
    }

    compare (comparisonTrack: Track): ComparisonResult {
        let nameResult = MatchValue.different
        let artistResult = MatchValue.different
        let albumResult = MatchValue.different

        var name1 = sanitizeStringBasic(this.name)
        var name2 = sanitizeStringBasic(comparisonTrack.name)
        if (name1 == name2){
            nameResult = MatchValue.match
        } else {
            name1 = sanitizeStringComplex(name1)
            name2 = sanitizeStringComplex(name2)
            if (name1 == name2){
                nameResult = MatchValue.match
            } else if (name1.length >= name2.length && name1.includes(name2)){
                nameResult = MatchValue.similar
            } else if (name2.length > name1.length && name2.includes(name1)){
                nameResult = MatchValue.similar
            } else {
                nameResult = MatchValue.different
            }
        }

        var artist1 = sanitizeStringBasic(this.artist)
        var artist2 = sanitizeStringBasic(comparisonTrack.artist)
        if (artist1 == artist2) {
            artistResult = MatchValue.match
        } else if (artist2.includes(artist1)) {
            artistResult = MatchValue.similar
        } else {
            artistResult = MatchValue.different
        }

        var album1 = sanitizeStringBasic(this.album)
        var album2 = sanitizeStringBasic(comparisonTrack.album)
        if (album1 == album2){
            albumResult = MatchValue.match
        } else {
            album1 = sanitizeStringComplex(album1)
            album2 = sanitizeStringComplex(album2)
            if (album1 == album2){
                albumResult = MatchValue.match
            } else if (album1.length >= album2.length && album1.includes(album2)){
                albumResult = MatchValue.similar
            } else if (album2.length > album1.length && album2.includes(album1)){
                albumResult = MatchValue.similar
            } else {
                albumResult = MatchValue.different
            }
        }

        return new ComparisonResult(nameResult, artistResult, albumResult)
    }

    baseTrack():Track {
        return this
    }
}

export class AppleTrack extends Track{
    id: string;
    genres: Array<string>;

    constructor(data: Apple.TrackData){
        let name = data.attributes.name
        let artist = data.attributes.artistName
        let album = data.attributes.albumName
        let rawCoverImage = data.attributes.artwork.url
        let coverImage = rawCoverImage.replace('{w}x{h}', '640x640')
        let duration = msToStandard(data.attributes.durationInMillis)
        super(name, artist, album, coverImage, duration)

        this.id = data.id
        this.genres = data.attributes.genreNames
    }
}

export class SpotifyTrack extends Track {
    id: string;
    preview: string;

    constructor(data: Spotify.TrackAttributes){
        let name = data.name
        let artist = data.artists[0].name
        let album = data.album.name
        let coverImage = data.album.images[0].url
        let duration =  msToStandard(data.duration_ms)
        super(name, artist, album, coverImage, duration)

        this.id = data.id
        this.preview = data.preview_url
    }
}

export class SpotifyAlbumTrack extends Track implements SpotifyTrack {
    id: string;
    preview: string;

    constructor(data: Spotify.AlbumTrack, albumName: string, albumCover: string){
        let name = data.name
        let artist = data.artists[0].name
        let album = albumName
        let coverImage = albumCover
        let duration =  msToStandard(data.duration_ms)
        super(name, artist, album, coverImage, duration)

        this.id = data.id
        this.preview = data.preview_url
    }
}

export class UniversalTrack extends Track {
    id: string;
    spotifyId: string;
    appleId: string;
    // coverImage: string;
    genres: string[];
    preview: string;

    constructor(spotifyTrack: SpotifyTrack, appleTrack: AppleTrack){
        let name = spotifyTrack.name
        let artist = spotifyTrack.artist
        let album = spotifyTrack.album
        let coverImage = spotifyTrack.coverImage
        let duration = spotifyTrack.duration
        super(name, artist, album, coverImage, duration)

        this.preview = spotifyTrack.preview
        this.spotifyId = spotifyTrack.id
        this.appleId = appleTrack.id
        this.genres = appleTrack.genres

        this.id = IdHash.createUniversalId(this.spotifyId, this.appleId, ObjectType.track)
    }

    toFirestoreData(): any{
        return ({
            spotifyId: this.spotifyId,
            appleId: this.appleId,
            name: this.name,
            artist: this.artist,
            album: this.album,
            coverImage: this.coverImage,
            genres: this.genres,
            duration: this.duration,
            preview: this.preview
        })
    }
}

export class FirestoreUniversalTrack extends Track implements UniversalTrack {
    id: string;
    spotifyId: string;
    appleId: string;
    // coverImage: string;
    genres: string[];
    preview: string;

    constructor(firestoreData: Firestore.FirestoreTrackData, firestoreId: string){
        let name = firestoreData.name
        let artist = firestoreData.artist
        let album = firestoreData.album
        let coverImage = firestoreData.coverImage
        let duration = firestoreData.duration

        super(name, artist, album, coverImage, duration)

        this.spotifyId = firestoreData.spotifyId
        this.appleId = firestoreData.appleId
        this.id = firestoreId
        this.preview = firestoreData.preview

        if (firestoreData.genres != undefined){
            this.genres = firestoreData.genres
        } else {
            this.genres = Array<string>()
        }
    }

    toFirestoreData():any{
        return ({
            spotifyId: this.spotifyId,
            appleId: this.appleId,
            name: this.name,
            artist: this.artist,
            album: this.album,
            coverImage: this.coverImage,
            genres: this.genres,
            duration: this.duration,
            preview: this.preview
        })
    }
}

export class JsonUniversalTrack extends Track implements UniversalTrack {
    id: string;
    spotifyId: string;
    appleId: string;
    genres: string[];
    preview: string;

    constructor(jsonString: string ){
        let trackData = JSON.parse(jsonString)
        let name = trackData.name
        let artist = trackData.artist
        let album = trackData.album
        let coverImage = trackData.coverImage
        let duration = trackData.duration

        super(name, artist, album, coverImage, duration)

        this.spotifyId = trackData.spotifyId
        this.appleId = trackData.appleId
        this.id = trackData.id
        this.genres = trackData.genres
        this.preview = trackData.preview
    }

    toFirestoreData():any{
        return ({
            spotifyId: this.spotifyId,
            appleId: this.appleId,
            name: this.name,
            artist: this.artist,
            album: this.album,
            coverImage: this.coverImage,
            genres: this.genres,
            duration: this.duration,
            preview: this.preview
        })
    }
}


export class Album {
    name: string
    artist: string
    
    constructor(name: string, artist: string){
        this.name = name
        this.artist = artist
    }

    //TODO: improve album comparison, possibly involving track count or release date
    // compare (comparisonAlbum: Album): MatchResult {
    //     if (this.artist.toLowerCase() == comparisonAlbum.artist.toLowerCase()) {
    //         if (this.name.toLowerCase() == comparisonAlbum.name.toLowerCase()){
    //             return new MatchResult(MatchValue.exactMatch, 100)
    //         }
    //         else {
    //             let matchPercentage = compareStrings(this.name, comparisonAlbum.name)
    //             return new MatchResult(MatchValue.match, matchPercentage)
    //         }
    //     }
    //     return new MatchResult(MatchValue.nonMatch, 0)
    // }
    // compare (comparisonAlbum: Album):any {}

    compare (comparisonAlbum: Album): ComparisonResult {

        let nameResult = MatchValue.different
        let artistResult = MatchValue.different
        // let albumResult = MatchValue.different

        var name1 = sanitizeStringBasic(this.name)
        var name2 = sanitizeStringBasic(comparisonAlbum.name)
        if (name1 == name2){
            nameResult = MatchValue.match
        } else {
            name1 = sanitizeStringComplex(name1)
            name2 = sanitizeStringComplex(name2)
            if (name1 == name2){
                nameResult = MatchValue.match
            } else if (name1.length >= name2.length && name1.includes(name2)){
                nameResult = MatchValue.similar
            } else if (name2.length > name1.length && name2.includes(name1)){
                nameResult = MatchValue.similar
            } else {
                nameResult = MatchValue.different
            }
        }

        var artist1 = sanitizeStringBasic(this.artist)
        var artist2 = sanitizeStringBasic(comparisonAlbum.artist)
        if (artist1 == artist2) {
            artistResult = MatchValue.match
        } else if (artist2.includes(artist1)) {
            artistResult = MatchValue.similar
        } else {
            artistResult = MatchValue.different
        }

        return new  ComparisonResult(nameResult, artistResult, MatchValue.match)
    }
    

    baseAlbum():Album {
        return this
    }
}

//TODO: Clean up artists
export class SpotifyAlbum extends Album{
    id: string
    coverImage: string
    // name: string
    // artist: string
    genres: Array<any>
    tracks: Array<SpotifyTrack>

    constructor (data: Spotify.AlbumResponse){
        let artists = new Array<string>()
        for (let artist of data.artists){
            artists.push(artist.name)
        }
        let name = data.name
        let artist = artists[0]
        super(name, artist)

        // this.artist = artists[0]
        this.id = data.id
        this.coverImage = data.images[0].url
        this.genres = data.genres

        let tracks = new Array<SpotifyTrack>()
        for (let trackData of data.tracks.items) {
            let track = new SpotifyAlbumTrack(trackData, this.name, this.coverImage)
            tracks.push(track)
        }
        this.tracks = tracks
    }
}

export class AppleAlbum extends Album{
    id: string
    coverImage: string
    // name: string
    // artist: string
    genres: Array<string>
    tracks: Array<AppleTrack>

    constructor (data: Apple.AlbumData){
        let name = data.attributes.name
        let artist = data.attributes.artistName
        super(name, artist)

        this.id = data.id
        let rawCoverImage = data.attributes.artwork.url
        this.coverImage = rawCoverImage.replace('{w}x{h}', '640x640')
        let tracks = new Array<AppleTrack>()
        for (let trackData of data.relationships.tracks.data) {
            let track = new AppleTrack(trackData)
            tracks.push(track)
        }
        this.tracks = tracks
        this.genres = data.attributes.genreNames
    }
}

export class UniversalAlbum extends Album {
    id: string
    spotifyId: string
    appleId: string
    // name: string
    coverImage: string
    // artist: string
    genres: Array<string>
    tracks: Array<UniversalTrack>

    constructor(spotifyAlbum:SpotifyAlbum, appleAlbum:AppleAlbum){
        let name = spotifyAlbum.name
        let artist = appleAlbum.artist
        super(name, artist)

        this.spotifyId = spotifyAlbum.id,
        this.appleId = appleAlbum.id
        this.coverImage = spotifyAlbum.coverImage
        this.genres = appleAlbum.genres

        this.id = IdHash.createUniversalId(this.spotifyId, this.appleId, ObjectType.album)

        //TODO: probably a cleaner way to do this
        let spotifyTracks = spotifyAlbum.tracks
        let appleTracks = appleAlbum.tracks
        let universalTracks = Array<UniversalTrack>()
        for (let spotifyTrack of spotifyTracks){
            for (let appleTrack of appleTracks){
                if (spotifyTrack.name.toLowerCase() == appleTrack.name.toLowerCase()){
                    let universalTrack = new UniversalTrack(spotifyTrack, appleTrack)
                    universalTracks.push(universalTrack)
                    break
                }
            }
        }
        this.tracks = universalTracks
    }

    toFirestoreData(): any{
        let firestoreTracks = Array<any>()
        for (let track of this.tracks){
            let trackData = {
                id: track.id,
                name: track.name,
                artist: track.artist,
                album: track.album,
                coverImage: track.coverImage,
                spotifyId: track.spotifyId,
                appleId: track.appleId,
                duration: track.duration,
                preview: track.preview
            }
            firestoreTracks.push(trackData)
        }

        return ({
            spotifyId: this.spotifyId,
            appleId: this.appleId,
            name: this.name,
            artist: this.artist,
            coverImage: this.coverImage,
            genres: this.genres,
            tracks: firestoreTracks
           
        })
    }
}


export class FirestoreUniversalAlbum extends Album implements UniversalAlbum {
    id: string
    spotifyId: string
    appleId: string
    // name: string
    coverImage: string
    // artist: string
    genres: Array<string>
    tracks: Array<UniversalTrack>

    constructor(data: Firestore.FirestoreAlbumData, firestoreId: string){
        let name = data.name
        let artist = data.artist
        super(name, artist)

        this.spotifyId = data.spotifyId
        this.appleId = data.appleId
        this.coverImage = data.coverImage
        this.genres = data.genres

        this.id = firestoreId

        //TODO: probably a cleaner way to do this
        // let tracksData = data.tracks
        // for (let trackData of data.tracks){

        // }
        // let appleTracks = appleAlbum.tracks
        let universalTracks = Array<UniversalTrack>()
        // for (let spotifyTrack of spotifyTracks){
        //     for (let appleTrack of appleTracks){
        //         if (spotifyTrack.name.toLowerCase() == appleTrack.name.toLowerCase()){
        //             let universalTrack = new UniversalTrack(spotifyTrack, appleTrack)
        //             universalTracks.push(universalTrack)
        //             break
        //         }
        //     }
        // }
        this.tracks = universalTracks
    }

    toFirestoreData(): any{
        let firestoreTracks = Array<any>()
        for (let track of this.tracks){
            let trackData = {
                id: track.id,
                name: track.name,
                artist: track.artist,
                album: track.album,
                coverImage: track.coverImage,
                spotifyId: track.spotifyId,
                appleId: track.appleId,
                duration: track.duration,
                preview: track.preview

            }
            firestoreTracks.push(trackData)
        }

        return ({
            spotifyId: this.spotifyId,
            appleId: this.appleId,
            name: this.name,
            artist: this.artist,
            coverImage: this.coverImage,
            genres: this.genres,
            tracks: firestoreTracks
           
        })
    }
}

export class Playlist {
    name: string
    description: string
    coverImage: string

    constructor (name: string, description: string, coverImage: string){
        this.name = name
        this.description = description
        this.coverImage = coverImage
    }
}

export class ApplePlaylist extends Playlist{
    id: string;
    tracks: Array<AppleTrack>;

    constructor (data:Apple.PlaylistData){
        let name = data.attributes.name
        var description = ''
        if (data.attributes.description){
            description = data.attributes.description.standard
        }
        let rawCoverImage = data.attributes.artwork.url
        let coverImage = rawCoverImage.replace('{w}x{h}', '640x640')
        super(name, description, coverImage)

        this.id = data.id
        this.tracks = new Array<AppleTrack>()

        let trackDataArray = data.relationships.tracks.data
        for (let trackData of trackDataArray){
            this.tracks.push(new AppleTrack(trackData))
        }
    }
}

export class SpotifyPlaylist extends Playlist{
    id: string;
    tracks: Array<SpotifyTrack>;

    constructor(data: Spotify.PlaylistResponse){
        let name = data.name
        let description = data.description
        let coverImage = data.images[0].url
        super(name, description, coverImage)

        this.id = data.id
        this.tracks = new Array<SpotifyTrack>()

        let trackDataArray = data.tracks.items
        for (let trackData of trackDataArray){
            this.tracks.push(new SpotifyTrack(trackData.track))
        }
    }
}


export class UniversalPlaylist extends Playlist{
    id: string;
    tracks: Array<UniversalTrack>;

    constructor(playlistDetails: Playlist, tracks:Array<UniversalTrack>){
        let name = playlistDetails.name
        let description = playlistDetails.description
        let coverImage = playlistDetails.coverImage
        super(name, description, coverImage)

        this.id = ''
        this.tracks = tracks
    }

    toFirestoreData(): any{

        var firestoreTracks = Array<any>()
        for (let track of this.tracks){
            let trackData = {
                id: track.id,
                name: track.name,
                artist: track.artist,
                album: track.album,
                coverImage: track.coverImage,
                spotifyId: track.spotifyId,
                appleId: track.appleId,
                duration: track.duration,
                preview: track.preview
            }
            firestoreTracks.push(trackData)
        }

        return ({
            
            name: this.name,
            description: this.description,
            coverImage: this.coverImage,
            tracks: firestoreTracks
        })
    }
}

export class FirestoreUniversalPlaylist extends Playlist implements UniversalPlaylist{
    id: string;
    tracks: Array<UniversalTrack>;

    constructor(data: Firestore.FirestorePlaylistData, playlistId: string){
        let name = data.name
        let description = data.description
        let coverImage = data.coverImage
        super(name, description, coverImage)

        this.id = playlistId
        var tracks = new Array<UniversalTrack>()
        for (let trackData of data.tracks){
            let trackId = IdHash.createUniversalId(trackData.spotifyId, trackData.appleId, ObjectType.track)
            let newTrack = new FirestoreUniversalTrack(trackData, trackId)
            tracks.push(newTrack)
        }
        this.tracks = tracks
    }

    toFirestoreData(): any{
        var firestoreTracks = Array<any>()
        for (let track of this.tracks){
            let trackData = {
                id: track.id,
                name: track.name,
                artist: track.artist,
                album: track.album,
                coverImage: track.coverImage,
                spotifyId: track.spotifyId,
                appleId: track.appleId,
                duration: track.duration,
                preview: track.preview
            }
            firestoreTracks.push(trackData)
        }

        return ({  
            name: this.name,
            description: this.description,
            coverImage: this.coverImage,
            tracks: firestoreTracks
        })
    }
}

export class JsonUniversalPlaylist extends Playlist implements UniversalPlaylist{
    id: string;
    tracks: Array<UniversalTrack>;

    constructor(jsonString: string){
        let data = JSON.parse(jsonString)
        let name = data.name
        let description = data.description
        let coverImage = data.coverImage
        super(name, description, coverImage)

        this.id = data.id
        var tracks = new Array<UniversalTrack>()
        for (let trackData of data.tracks){
            let trackJson = JSON.stringify(trackData)
            let newTrack = new JsonUniversalTrack(trackJson)
            tracks.push(newTrack)
        }
        this.tracks = tracks
    }

    toFirestoreData(): any{
        var firestoreTracks = Array<any>()
        for (let track of this.tracks){
            let trackData = {
                id: track.id,
                name: track.name,
                artist: track.artist,
                album: track.album,
                coverImage: track.coverImage,
                spotifyId: track.spotifyId,
                appleId: track.appleId,
                duration: track.duration,
                preview: track.preview
            }
            firestoreTracks.push(trackData)
        }

        return ({  
            name: this.name,
            description: this.description,
            coverImage: this.coverImage,
            tracks: firestoreTracks
        })
    }
}





