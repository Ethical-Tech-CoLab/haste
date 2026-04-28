# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

"""Tests for Airbus source type support in imagery utilities and workflows."""

from unittest.mock import MagicMock

import numpy as np
import pytest
from osgeo import gdal

from hastegeo.core.utils.imagery import ImageryUtils
from hastegeo.workflows.prepare_imagery import _determine_scale_rgb_params


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_mock_dataset(num_bands: int) -> MagicMock:
    """Create a mock GDAL dataset with the specified number of bands."""
    dataset = MagicMock()
    dataset.RasterCount = num_bands

    def get_raster_band(idx: int) -> MagicMock:
        band = MagicMock()
        band.ReadAsArray.return_value = np.random.randint(
            0, 5000, (64, 64), dtype=np.uint16
        )
        band.GetColorInterpretation.return_value = 0  # GCI_Undefined
        return band

    dataset.GetRasterBand = get_raster_band
    dataset.__enter__ = lambda self: self
    dataset.__exit__ = MagicMock(return_value=False)
    return dataset


@pytest.fixture()
def mock_gdal_open(mocker):
    """Patch gdal.Open to return a configurable mock dataset."""
    holder: dict = {"dataset": None}

    def _open_side_effect(*args, **kwargs):
        return holder["dataset"]

    mocker.patch.object(gdal, "Open", side_effect=_open_side_effect)
    return holder


def _set_bands(holder: dict, num_bands: int) -> None:
    """Configure the mock GDAL dataset with *num_bands* bands."""
    holder["dataset"] = _make_mock_dataset(num_bands)


# ---------------------------------------------------------------------------
# Tests — Airbus band indexes
# ---------------------------------------------------------------------------


class TestGetRgbBandIndexesAirbus:
    """Tests for get_rgb_band_indexes with Airbus source type."""

    def test_airbus_4band_returns_3_2_1(self, mock_gdal_open) -> None:
        """UT-001: Airbus 4-band imagery returns [3, 2, 1] band indexes (R, G, B)."""
        _set_bands(mock_gdal_open, 4)

        result = ImageryUtils.get_rgb_band_indexes("fake.tif", source_type="airbus")

        assert result == [3, 2, 1]

    def test_airbus_3band_returns_1_2_3(self, mock_gdal_open) -> None:
        """UT-002: Airbus 3-band imagery returns [1, 2, 3] band indexes (R, G, B)."""
        _set_bands(mock_gdal_open, 3)

        result = ImageryUtils.get_rgb_band_indexes("fake.tif", source_type="airbus")

        assert result == [1, 2, 3]

    def test_airbus_1band_falls_through_to_default(self, mock_gdal_open) -> None:
        """UT-003: Airbus 1-band (panchromatic) falls through to GDAL fallback."""
        _set_bands(mock_gdal_open, 1)

        result = ImageryUtils.get_rgb_band_indexes("fake.tif", source_type="airbus")

        # 1-band: no Airbus-specific handling, falls through to GDAL color
        # interpretation fallback which returns [1, 2, 3] for undefined bands
        assert result == [1, 2, 3]


# ---------------------------------------------------------------------------
# Tests — Airbus scale params
# ---------------------------------------------------------------------------


class TestGetScaleImageryParamsAirbus:
    """Tests for get_scale_imagery_params with Airbus source type."""

    def test_airbus_scale_params_returns_0_5000(self, mock_gdal_open) -> None:
        """UT-004: Airbus scale params returns [[0, 5000, 0, 255]] for each band."""
        _set_bands(mock_gdal_open, 4)

        result = ImageryUtils.get_scale_imagery_params(
            "fake.tif", source_type="airbus"
        )

        assert result == [
            [0, 5000, 0, 255],
            [0, 5000, 0, 255],
            [0, 5000, 0, 255],
        ]


# ---------------------------------------------------------------------------
# Tests — _determine_scale_rgb_params
# ---------------------------------------------------------------------------


class TestDetermineScaleRgbParams:
    """Tests for _determine_scale_rgb_params with Airbus and regression cases."""

    def test_airbus_returns_true(self) -> None:
        """UT-005: _determine_scale_rgb_params('airbus') returns True."""
        assert _determine_scale_rgb_params("airbus") is True

    def test_maxar_returns_false(self) -> None:
        """UT-013: _determine_scale_rgb_params('maxar') returns False (regression)."""
        assert _determine_scale_rgb_params("maxar") is False

    def test_planet_scope_returns_true(self) -> None:
        """Regression: _determine_scale_rgb_params('planet_scope') still True."""
        assert _determine_scale_rgb_params("planet_scope") is True

    def test_planet_skysat_returns_true(self) -> None:
        """Regression: _determine_scale_rgb_params('planet_skysat') still True."""
        assert _determine_scale_rgb_params("planet_skysat") is True


# ---------------------------------------------------------------------------
# Tests — Regression for existing source types
# ---------------------------------------------------------------------------


class TestRegressionExistingSourceTypes:
    """Regression tests to ensure existing source types are unchanged."""

    def test_maxar_4band_unchanged_returns_3_2_1(self, mock_gdal_open) -> None:
        """UT-008: Maxar 4-band still returns [3, 2, 1] band indexes."""
        _set_bands(mock_gdal_open, 4)

        result = ImageryUtils.get_rgb_band_indexes("fake.tif", source_type="maxar")

        assert result == [3, 2, 1]

    def test_planet_scope_4band_unchanged_returns_3_2_1(self, mock_gdal_open) -> None:
        """UT-009: PlanetScope 4-band still returns [3, 2, 1] band indexes."""
        _set_bands(mock_gdal_open, 4)

        result = ImageryUtils.get_rgb_band_indexes("fake.tif", source_type="planet_scope")

        assert result == [3, 2, 1]

    def test_skysat_scale_params_unchanged_returns_0_600(
        self, mock_gdal_open
    ) -> None:
        """UT-010: SkySat scale params still returns [[0, 600, 0, 255]] per band."""
        _set_bands(mock_gdal_open, 4)

        result = ImageryUtils.get_scale_imagery_params(
            "fake.tif", source_type="planet_skysat"
        )

        assert result == [
            [0, 600, 0, 255],
            [0, 600, 0, 255],
            [0, 600, 0, 255],
        ]


# ---------------------------------------------------------------------------
# Tests — Normalization (computed-from-file, no hardcoding)
# ---------------------------------------------------------------------------


class TestNormalizationComputedFromFile:
    """Tests verifying normalization uses computed-from-file behavior for all types."""

    def test_airbus_normalization_means_returns_all_zeros(self, mock_gdal_open) -> None:
        """UT-006: Airbus normalization means computed as all zeros (same as all providers)."""
        _set_bands(mock_gdal_open, 4)

        result = ImageryUtils.get_normalization_means("fake.tif", source_type="airbus")

        assert result == [0, 0, 0, 0]

    def test_airbus_normalization_stds_returns_98th_percentile(self, mock_gdal_open) -> None:
        """UT-007: Airbus normalization stdevs computed as 98th percentile per band."""
        _set_bands(mock_gdal_open, 4)

        result = ImageryUtils.get_normalization_std_devs("fake.tif", source_type="airbus")

        assert result is not None
        assert len(result) == 4
        assert all(isinstance(v, int) for v in result)
        assert all(v > 0 for v in result)

    def test_maxar_normalization_means_unchanged(self, mock_gdal_open) -> None:
        """UT-011: Maxar normalization means still returns all zeros (regression)."""
        _set_bands(mock_gdal_open, 4)

        result = ImageryUtils.get_normalization_means("fake.tif", source_type="maxar")

        assert result == [0, 0, 0, 0]

    def test_maxar_normalization_stds_unchanged(self, mock_gdal_open) -> None:
        """UT-012: Maxar normalization stdevs still computed from file (regression)."""
        _set_bands(mock_gdal_open, 4)

        result = ImageryUtils.get_normalization_std_devs("fake.tif", source_type="maxar")

        assert result is not None
        assert len(result) == 4
        assert all(isinstance(v, int) for v in result)
