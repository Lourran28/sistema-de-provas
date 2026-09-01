package br.com.provas.services;

public record ExportedExamDocument(byte[] content, String filename, String mediaType) {
}
