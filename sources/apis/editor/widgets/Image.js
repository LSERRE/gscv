define( [

    'vendors/Backbone',
    'vendors/JQuery',
    'vendors/Underscore',

    'apis/editor/popups/Texture',
    'apis/editor/widgets/Tabbed',
    'apis/editor/widgets/Vertical',
    'apis/editor/widgets/Widget'

], function ( Backbone, $, _, TexturesPopup, TabbedWidget, VerticalWidget, Widget ) {

    return Widget.extend( {

        el : [ '<div class="widget image-widget">'
             , '    <div class="widget-wrapper">'
             , '        <a class="display toggle">'
             , '            <img class="preview" />'
             , '        </a>'
             , '    </div>'
             , '    <div class="selectbox">'
             , '    </div>'
             , '</div>'
        ].join( '' ),

        events : _.extend( { }, Widget.prototype.events, {
            'click .toggle' : 'toggleEvent',
            'click .open' : 'openEvent'
        } ),

        initialize : function ( options ) {

            options = _.defaults( options || { }, {

                model        : new Backbone.Model( ),
                name         : 'value',

                allowColor   : true,
                allowTexture : true,

                // Expects models to have { label:, value:, image: } properties
                collection   : new Backbone.Collection( )

            } );

            Widget.prototype.initialize.call( this, options );

            this.globalCloseEvent_ = this.globalCloseEvent.bind( this );

            if ( typeof this.get( ) === 'undefined' )
                this.set( { r : 1, g : 1, b : 1 } );

            var colorPanel, texturePanel;

            if ( this.options.allowColor && this.options.allowTexture ) {

                var tabbed = TabbedWidget.reify( this );
                this.$( '.selectbox' ).append( tabbed.$el );
                texturePanel = tabbed.createPanel( 'Texture' );
                colorPanel = tabbed.createPanel( 'Color' );

            } else {

                if ( this.options.allowColor ) {
                    colorPanel = VerticalWidget.reify( this );
                    this.$( '.selectbox' ).append( colorPanel.$el );
                }

                if ( this.options.allowTexture ) {
                    texturePanel = VerticalWidget.reify( this );
                    this.$( '.selectbox' ).append( texturePanel.$el );
                }

            }

            if ( this.options.allowColor ) {

                this.colorWidget = colorPanel.createWidget( 'Color' );
                this.colorWidget.on( 'change', this.applyColorEvent, this );

            }

            if ( this.options.allowTexture ) {

                var importWidget = texturePanel.createWidget( 'Button', {
                    text : 'Manage textures',
                } );

                importWidget.model.on( 'click', function ( ) {

                    var popup = new TexturesPopup( this, {

                        model : this.textureWidget.options.model,
                        name : this.textureWidget.options.name,

                        collection : this.options.collection

                    } );

                    popup.on( 'uploadRequest', function ( file ) {
                        this.model.trigger( 'uploadSelectEvent', file );
                    }.bind( this ) );

                }.bind( this ) );

                this.textureWidget = texturePanel.createWidget( 'Select', {
                    placeholder : 'Choose texture',
                    options : this.options.collection,
                    image : 'image'
                } );

                this.textureWidget.model.on( 'change', this.applyTextureEvent, this );
                this.model.on( 'change', this.updateTextureEvent, this );
                this.options.collection.on( 'add', this.updateTextureEvent, this );

                this.updateTextureEvent( );

                var filtering = texturePanel.createWidget( 'Horizontal' );
                filtering.createWidget( 'Label', { content: 'Filtering:', classname: 'setting' } );
                filtering.createWidget( 'Select', {
                    model: this.model,
                    name: this.field( 'minFilter' ),
                    allowEmpty: false,
                    options: { 'NEAREST': 'Nearest', 'LINEAR': 'Bilinear', 'LINEAR_MIPMAP_LINEAR': 'Trilinear' }
                } );

                var format = texturePanel.createWidget( 'Horizontal' );
                format.createWidget( 'Label', { content: 'Format:', classname: 'setting' } );
                format.createWidget( 'Select', {
                    model: this.model,
                    name: this.field( 'internalFormat' ),
                    allowEmpty: false,
                    options: { 'RGB': 'RGB', 'RGBA': 'RGBA', 'LUMINANCE': 'Luminance' }
                } );

                var wraps = texturePanel.createWidget( 'Horizontal' );
                wraps.createWidget( 'Label', { content: 'Wrap S:', classname: 'setting' } );
                wraps.createWidget( 'Select', {
                    model: this.model,
                    name: this.field( 'wrapS' ),
                    allowEmpty: false,
                    options: { 'REPEAT': 'Repeat', 'MIRRORED_REPEAT': 'Mirror', 'CLAMP_TO_EDGE': 'Clamp' }
                } );

                var wrapt = texturePanel.createWidget( 'Horizontal' );
                wrapt.createWidget( 'Label', { content: 'Wrap T:', classname: 'setting' } );
                wrapt.createWidget( 'Select', {
                    model: this.model,
                    name: this.field( 'wrapT' ),
                    allowEmpty: false,
                    options: { 'REPEAT': 'Repeat', 'MIRRORED_REPEAT': 'Mirror', 'CLAMP_TO_EDGE': 'Clamp' }
                } );
            }
        },

        delegateEvents : function ( ) {

            Widget.prototype.delegateEvents.apply( this, arguments );

            $( document ).on( 'mousedown', this.globalCloseEvent_ );

        },

        undelegateEvents : function ( ) {

            Widget.prototype.undelegateEvents.apply( this, arguments );

            $( document ).off( 'mousedown', this.globalCloseEvent_ );

        },

        render : function ( ) {

            Widget.prototype.render.apply( this, arguments );

            var value = this.get( );

            if ( value instanceof Image ) {
                this.$( '.preview' ).attr( 'src', value.src );
            } else {
                this.$( '.preview' ).attr( 'src', 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==' );
                this.$( '.preview' ).css( 'background-color', 'rgb(' + Math.round( value.r * 255 ) + ',' + Math.round( value.g * 255 ) + ',' + Math.round( value.b * 255 ) + ')');

                // We might have a color without colorWidget (if options.allowColor is false)
                if ( this.colorWidget ) {
                    this.colorWidget.set( value )
                }
            }

        },

        toggleEvent : function ( e ) {

            if ( this.$el.hasClass( 'opened' ) ) {
                this.closeEvent( e );
            } else {
                this.openEvent( e );
            }

        },

        openEvent : function ( e ) {

            e.preventDefault( );
            e.stopPropagation( );

            this.$el.addClass( 'opened' );

        },

        closeEvent : function ( e ) {

            this.$el.removeClass( 'opened' );

        },

        globalCloseEvent : function ( e ) {

            if ( $.contains( this.el, e.target ) )
                return ;

            this.closeEvent( e );

        },

        applyColorEvent : function ( ) {

            this.change( this.colorWidget.get( ) );

        },

        applyTextureEvent : function ( ) {

            // CP:
            // ok we need to discuss about this
            // first I needed to add information in image because
            // I need to keep track of the uid of the image
            // url is not an identifier.
            // also Image should be managed and not loaded directly
            // with the src.
            // Ideally I would like transport data with an image object
            // I would provide and also with an uid
            var textureUID = this.textureWidget.get( );
            var texture = this.options.collection.findWhere( {
                'value': textureUID
            } );

            if ( ! texture )
                return ;

            var imageModel = texture.get( 'imageModel' );
            var imageURL = texture.get( 'image' );
            var image = new Image( );

            if ( imageModel === null ) {
                this.change( { r : 1, g : 1, b : 1 } );
                return;
            }

            // need cross origin to avoid to taint canvas later
            var isInlineImage = ( imageURL.substr(0, 'data:image'.length ) === 'data:image' );
            if (!isInlineImage){
                image.crossOrigin = 'anonymous';
            }
            image.src = imageURL;

            image.imageModel = imageModel;
            image.addEventListener( 'load', function () {
                this.change( image );
            }.bind( this ), false );

        },

        updateTextureEvent : function ( ) {

            var value = this.get( );

            if ( value instanceof Image ) {
                var selectedTexture = this.options.collection.findWhere( { image : value.src } );
                this.textureWidget.set( selectedTexture ? selectedTexture.get( 'value' ) : null );
            } else {
                this.textureWidget.set( null );
            }

        }

    } );

} );
