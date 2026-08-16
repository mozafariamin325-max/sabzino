from django.contrib import admin
from .models import Province, City, District, Neighborhood


@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ("name", "province", "has_identity", "landmark_name", "landmark_icon")
    list_filter = ("has_identity", "province")
    list_editable = ("has_identity",)
    fields = (
        "province", "name", "lat", "lng",
        "has_identity", "landmark_name", "landmark_icon",
        "theme_color_from", "theme_color_to", "hero_tagline",
    )


admin.site.register(Province)
admin.site.register(District)
admin.site.register(Neighborhood)
