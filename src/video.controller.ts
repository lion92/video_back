import {
    Controller,
    Post,
    UploadedFiles,
    Body,
    Res,
    HttpStatus,
    Logger,
    UseInterceptors,
} from '@nestjs/common';
import { VideoService } from './video.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as path from 'path';

@Controller('video')
export class VideoController {
    private readonly logger = new Logger(VideoController.name);

    constructor(private readonly videoService: VideoService) {}

    @Post('generate')
    @UseInterceptors(FilesInterceptor('images', 50, { dest: './uploads' })) // Configuration de dest pour enregistrer les fichiers
    async generateVideo(
        @UploadedFiles() files: Express.Multer.File[],
        @Body('texts') texts: string,
        @Res() res: Response
    ) {
        this.logger.log('Requête reçue pour générer une vidéo');

        try {
            const parsedTexts = JSON.parse(texts);

            if (!files || files.length === 0) {
                this.logger.warn('Aucune image fournie');
                return res.status(HttpStatus.BAD_REQUEST).json({ message: 'No images provided' });
            }

            if (!parsedTexts || parsedTexts.length !== files.length) {
                this.logger.warn('Le nombre de textes ne correspond pas au nombre d\'images');
                return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Text array length must match images' });
            }

            // Vérifier les fichiers reçus
            files.forEach((file, index) => {
                this.logger.log(`Image ${index} - Originalname: ${file.originalname}, Path: ${file.path}`);
            });

            const outputVideoPath = path.join(__dirname, '../../output', `output_${Date.now()}.mp4`);
            await this.videoService.createVideo(files, parsedTexts, outputVideoPath);

            this.logger.log('Vidéo générée avec succès');
            return res.sendFile(outputVideoPath);
        } catch (error) {
            this.logger.error('Erreur lors de la génération de la vidéo', error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Error generating video', error });
        }
    }
}
