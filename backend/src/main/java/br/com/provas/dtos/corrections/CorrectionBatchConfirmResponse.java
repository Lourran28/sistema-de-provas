package br.com.provas.dtos.corrections;

import java.util.List;

public record CorrectionBatchConfirmResponse(int confirmedCount, List<CorrectionResponse> corrections) {
}
