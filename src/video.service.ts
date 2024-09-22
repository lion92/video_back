import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs-extra'; // Utilisation de fs-extra pour les opérations de fichiers
import * as path from 'path';
const ffmpeg = require('fluent-ffmpeg');
const gTTS = require('node-gtts');

@Injectable()
export class VideoService {
    private readonly logger = new Logger(VideoService.name);

    async createVideo(images: Express.Multer.File[], texts: string[], outputVideoPath: string): Promise<string> {
        this.logger.log('Démarrage de la création de la vidéo');
        const tempDir = path.join(__dirname, '../temp'); // Chemin du dossier temporaire
        const outputDir = path.dirname(outputVideoPath); // Récupérer le répertoire de sortie
        this.logger.log(`Chemin du dossier temporaire : ${tempDir}`);
        this.logger.log(`Chemin du dossier de sortie : ${outputDir}`);

        try {
            // Créer les répertoires temp et output si nécessaires
            await fs.ensureDir(tempDir);
            this.logger.log(`Dossier 'temp' créé ou déjà existant`);

            await fs.ensureDir(outputDir);
            this.logger.log(`Dossier 'output' créé ou déjà existant`);

            // Générer des fichiers audio à partir du texte
            const audioFiles = await Promise.all(
                texts.map((text, index) => {
                    const audioPath = path.join(tempDir, `audio${index}.mp3`);
                    this.logger.log(`Création du fichier audio : ${audioPath}`);
                    return this.synthesizeSpeech(text, audioPath);
                })
            );

            const ffmpegCommand = ffmpeg();

            // Ajouter les images et les fichiers audio à ffmpeg
            for (let index = 0; index < images.length; index++) {
                const image = images[index];

                if (!image.path) {
                    this.logger.error(`Le chemin de l'image à l'index ${index} est indéfini.`);
                    throw new Error(`Le chemin de l'image à l'index ${index} est indéfini.`);
                }

                if (!audioFiles[index] || !(await fs.pathExists(audioFiles[index]))) {
                    this.logger.error(`Le fichier audio à l'index ${index} n'existe pas ou est indéfini.`);
                    throw new Error(`Le fichier audio à l'index ${index} n'existe pas ou est indéfini.`);
                }

                this.logger.log(`Ajout de l'image ${image.path} et du fichier audio ${audioFiles[index]} à ffmpeg.`);
                ffmpegCommand.input(image.path).input(audioFiles[index]);
            }

            // Configuration des filtres pour concaténer les fichiers
            const filterComplex = images
                    .map((_, index) => `[${index * 2}:v]scale=1920:1080,setdar=16/9[v${index}]; [${index * 2 + 1}:a]anull[a${index}]`)
                    .join('; ') +
                '; ' +
                images
                    .map((_, index) => `[v${index}][a${index}]`)
                    .join('') + `concat=n=${images.length}:v=1:a=1[v][a]`;

            // Générer la vidéo avec ffmpeg
            return new Promise((resolve, reject) => {
                ffmpegCommand
                    .complexFilter(filterComplex)
                    .on('error', (err) => {
                        this.logger.error(`Erreur lors de la création de la vidéo : ${err.message}`);
                        reject(err);
                    })
                    .on('end', async () => {
                        this.logger.log('Création de la vidéo terminée');
                        // Nettoyer le dossier temporaire après la création de la vidéo
                        await fs.remove(tempDir);
                        this.logger.log('Nettoyage des fichiers temporaires terminé');
                        resolve(outputVideoPath);
                    })
                    .output(outputVideoPath)
                    .outputOptions('-map', '[v]', '-map', '[a]')
                    .videoCodec('libx264')
                    .audioCodec('aac')
                    .outputOptions('-pix_fmt yuv420p')
                    .run();
            });
        } catch (error) {
            this.logger.error('Erreur lors du traitement de la vidéo', error);
            throw error;
        }
    }

    // Méthode pour générer la synthèse vocale à partir du texte
    private async synthesizeSpeech(text: string, outputFilePath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const gtts = gTTS('fr');
            gtts.save(outputFilePath, text, (err) => {
                if (err) {
                    this.logger.error(`Erreur lors de la synthèse de la parole pour le texte : ${text}`, err);
                    return reject(err);
                }
                this.logger.log(`Synthèse de la parole terminée pour le texte : ${text}`);
                resolve(outputFilePath);
            });
        });
    }
}
