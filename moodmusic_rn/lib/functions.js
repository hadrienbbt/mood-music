/**
 * Created by hadrien1 on 25/06/2017.
 */
'use strict'

var firstLetterUppercase = String.prototype.firstLetterUppercase = function() {
    return this.charAt(0).toUpperCase() + this.slice(1).toLowerCase()
}

var getFileExtension = String.prototype.getFileExtension = function() {
    var re = /(?:\.([^.]+))?$/
    var ext = re.exec(this)[1].toLowerCase()
    return ext
}

var getExtension = String.prototype.getExtension = function() {

    // base 64 strings
    if (this.substr(5,5) === 'image') return extensions.IMAGE
    else if (this.substr(5,5) === 'video') return extensions.VIDEO

    var re = /(?:\.([^.]+))?$/
    var ext = re.exec(this)[1].toLowerCase()
    const types = {
        image: ['png','jpg','jpeg','bmp','gif'],
        video: ['mp4','mov','mkv','avi'],
    }

    return types.image.includes(ext) ?
            extensions.IMAGE
         : types.video.includes(ext) ?
            extensions.VIDEO
         : extensions.UNDEFINED
}

export { firstLetterUppercase,getExtension,getFileExtension }