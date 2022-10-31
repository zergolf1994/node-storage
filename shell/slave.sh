#!/usr/bin/env bash
set -e
[[ ! "${1}" ]] && echo "Usage: slave.sh [slug] [sv_ip]" && exit 1
[[ ! "${2}" ]] && echo "Usage: slave.sh [slug] [sv_ip]" && exit 1
localip=$(hostname -I | awk '{print $1}')
rootpath="/home/files"
slug=${1}
sv_ip=${2}
linkapi="http://${sv_ip}:8888/download/data?slug=${slug}"
call_data=$(curl -sS "$linkapi")
status=$(echo $call_data | jq -r '.status')

if [[ ! "$status" ]]; then
	#curl -sS "http://127.0.0.1:8888/error/${slug}/"
	echo "exit"
	exit 1
fi

speed=10
quality=$(echo $call_data | jq -r '.quality[]')

for files in ${quality[@]}; do
	link_data="${linkapi}&quality=$files"
	call=$(curl -sS "$link_data")
	lst=$(echo $call | jq -r '.status')
    if [[ "$lst" == "false" ]]; then
		echo $lst
	else
		token=$(echo $call | jq -r '.data.token')
		title=$(echo $call | jq -r '.data.title')
		backup=$(echo $call | jq -r '.data.backup')
		quality=$(echo $call | jq -r '.data.quality')
		save_path=${rootpath}/${token}

		#gdrive info
		gdrive_api="http://127.0.0.1:8888/gdrive/info?gid=${backup}"
		gdrive_data=$(curl -sS "$gdrive_api")
		gdrive_status=$(echo $gdrive_data | jq -r '.status')

        if [[  "$gdrive_status" == "false" ]]; then
			echo $gdrive_status
		else
			gdrive_name=$(echo $gdrive_data | jq -r '.data.Name')
			gdrive_ext=$(echo $gdrive_data | jq -r '.data.ext')

			mkdir -p ${save_path}
			chmod 0777 ${save_path}

            tmp_link="http://${sv_ip}:8888/${token}/file_${title}.${gdrive_ext}"
			tmp_download=${save_path}/download.txt
			file_save=${save_path}/file_${title}.${gdrive_ext}

			if [[ -f "$tmp_download" ]]; then
				rm -rf ${tmp_download}
			fi
            
			if [[ -f "$file_save" ]]; then
				rm -rf ${file_save}
			fi

	  	    axel -n ${speed} -o "${file_save}" "${tmp_link}" >> ${tmp_download} 2>&1
            sleep 2
			sudo rm -rf ${tmp_download}
            curl -sS "http://${sv_ip}:8888/download/done?token=${token}"
            sleep 2
            curl -sS "http://127.0.0.1:8888/slave/done?slug=${slug}&quality=${files}&sv_ip=${localip}"
  		    echo "Downloaded ${files}"
        fi
    fi

done
sleep 2
curl -sS "http://127.0.0.1:8888/slave/done?slug=${slug}&slave_ip=${sv_ip}"
sleep 2
curl -sS "http://${sv_ip}:8888/run"
exit 1